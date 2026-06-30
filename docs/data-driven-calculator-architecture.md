# Data-Driven BOM Calculator — Architecture Overview

*A self-contained explainer for the QuickScreen / Glass Outlet bill-of-materials (BOM)
engine. Written to be read without repo access — for rubber-ducking the design.*

---

## 1. What it does

Given a fence/screen/gate configuration (length, height, slat size, gap, colour, post
mounting, corners, gates), produce a **priced bill of materials** — every post, rail,
slat, side frame, bracket, screw, cap and accessory, with quantities and prices.

The product is sold to fencing suppliers (The Glass Outlet, Amazing Fencing, …), each a
separate tenant (`org_id` on every table, row-level security per org).

## 2. The core design bet

**The BOM logic is DATA, not CODE.** All calculation behaviour — formulas, which
components get emitted, how SKUs are chosen, validations, auto-added companions, warnings
— lives in **seeded Postgres tables**, authored as per-product JSON files and loaded by an
upserter. A single, product-agnostic edge function (Deno) reads those rows and runs them.

The intended payoff: **adding a new fence system or onboarding a new supplier = new data
rows, not new code branches.** The engine never has `if (productCode === 'QSHS')` logic;
all of that lives in QSHS's seed rows.

> This is the thing I'm second-guessing — see §7.

## 3. The data flow

```
Canvas / form  ──►  CanonicalPayload (one JSON shape)  ──►  edge function  ──►  priced BOM
                     { productCode, variables,                (reads seed rows,
                       runs[ segments[…] ] }                   runs them in stages)
```

- **CanonicalPayload** is the single shape shared by the drawing canvas, the form, the
  engine, and persistence. A *run* is a continuous fence line; a run has ordered
  *segments* (fence panels or a gate); each segment has a width, target height,
  left/right *terminations* (system post / wall / corner / join), and variable overrides.
- Variables cascade: `payload.variables` (job-level) → `run.variables` → `segment.variables`.

## 4. The engine pipeline (one product-agnostic function)

For each unique `productCode` in the payload, the engine loads that product's current
rule set and runs, per segment, roughly these stages:

1. **Resolve tenant** — `org_id` + pricing tier from the user's JWT (never trust client).
2. **Normalise variables** — apply defaults from `product_variables`; map long colour
   names (`black-satin`) → short codes (`B`).
3. **Validate** — run `product_validations`; a `severity=error` short-circuits the run.
4. **Run `product_rules`** in stage order: `derive` → `stock` → `accessory` → `component`.
   Each rule is a **math.js expression string** evaluated against a per-segment context
   (geometry the engine injects: `num_panels`, `panel_width_mm`, `num_posts`,
   termination flags, etc. + the variables). A rule writes one `output_key` back into the
   context, so later rules build on earlier ones.
5. **Resolve SKUs** via `product_component_selectors` — a rule produces a *quantity* under
   some `qty_key`; a selector maps `(category, qty_key, match conditions)` → a SKU pattern
   like `XP-6100-S65-{colour}`, with placeholders filled from context.
6. **Apply `product_companion_rules`** — "X triggers Y": e.g. each side frame auto-adds a
   CFC cover; each gate auto-adds hinges. Trigger category → added component + qty formula.
7. **Warnings** — `product_warnings` conditions populate non-blocking warnings / info.
8. **Aggregate** lines by SKU (+ run), then **price** each line (last, non-fatal stage).
9. Return `{ lines, runResults, gateItems, totals, warnings, errors, … }`.

Every math.js evaluation is wrapped in try/catch — a failed rule is logged and skipped,
the pipeline never aborts. (This is double-edged — see §7.)

## 5. The tables (brief)

**Versioning / containers**
- `rule_sets` — a named bundle of rules per product (e.g. "QSHS Fence Rules").
- `rule_versions` — versions of a rule set; exactly one `is_current=true`. The engine
  reads the current version. (Lets you stage rule changes.)

**The behaviour (the "code as data")**
- `product_variables` — field definitions: name, type, default, options, scope
  (`job`/`run`/`segment`). Drives both the form and the engine's defaults.
- `product_rules` — stage-ordered math.js expressions. `expression` → `output_key`.
  The heart of the calculation.
- `product_constraints` — min/max/threshold/enum bounds, optionally conditional.
- `product_validations` — math.js booleans; `error` blocks, `warning` advises.
- `product_component_selectors` — `(category, qty_key, match_json)` → `sku_pattern`.
  Turns a computed quantity into an actual catalogue SKU (with `{colour}` placeholders).
- `product_companion_rules` — "trigger component → auto-add component" with a qty formula.
- `product_warnings` — non-blocking reviewer notes / blocking engine errors, conditional.

**Catalogue & pricing**
- `products` — one row per fence system / gate (flat; `product_type` = fence|gate|…,
  `compatible_with_system_types` lets a shared gate pair with many fences).
- `product_components` — the catalogue: one row per SKU (name, category, unit,
  default_price, which systems it belongs to). SKU unique per org.
- `pricing_rules` — priced as **qty-break rules**: `(component_id, tier_code, rule, price,
  priority)`. `rule` is a math.js predicate on `qty` (e.g. `qty >= 50`); highest matching
  priority wins. Unique on `(component_id, tier_code, priority) WHERE active`. Pricing is
  tiered (tier1/2/3 = retail/trade levels). A view `pricing_rules_with_sku` joins in the SKU.

**Persistence**
- `quote_runs` / `quote_run_segments` — store the canonical payload for a saved quote.

**Authoring:** each product is one JSON file (`qshs.json`, `qs_gate.json`, …) containing
all the above sections; a Node upserter validates against JSON Schemas, resolves
business-key FKs, and upserts. To change behaviour you edit JSON and re-seed — no SQL,
no code.

## 6. Important current reality (context for the rubber-duck)

There are **two engines** in the repo:
- A **static engine** (~1,400 lines of hardcoded TypeScript). It is what the live app
  actually calls today. Trusted/correct for the main product (QSHS), but it's the
  anti-architecture: per-product `if` branches, hardcoded catalogue, no real logic for
  some systems (e.g. it has no genuine XPL handling — it falls through to generic output).
- The **data-driven engine** described above. It's the documented target architecture, but
  **it is not yet wired into the app** — only a test harness calls it.

The consolidation plan: bring the data-driven engine to parity with the static one
(verified for QSHS + gate via a parity harness), then flip the live app to it and delete
the static engine. Parity for the *other* systems is unresolved, because the static engine
isn't a reliable oracle for them (it was authored deeply only for QSHS).

## 7. Tradeoffs & things worth pressure-testing (the rubber-duck list)

Honest tensions I've hit working in this engine:

1. **math.js-strings-in-JSON is powerful but fragile.** Rules are stringly-typed
   expressions with no compile-time checking. A typo or a reference to a context variable
   the engine doesn't actually provide fails **silently** (caught + skipped), producing a
   sparse/wrong BOM that *looks* fine. I hit exactly this: seed rules referenced
   `product_post_boundary_count` / `left_is_product_post` that the engine never injected —
   whole component chains silently vanished. **Question: is the debuggability cost worth
   the "no code changes" benefit, or would a typed rule DSL / real code modules per product
   be safer?**

2. **The engine↔seed contract is implicit.** The engine injects a set of geometry
   primitives into the rule context; the seeds must reference exactly those names. Nothing
   enforces or documents that contract — it's discovered by reading both sides. **Question:
   should the provided context be a declared, validated schema?**

3. **A lot of indirection to express what is essentially a spreadsheet.** A single line
   item ("emit N side frames in colour C") can involve a variable, 2–3 chained rules, a
   selector, and a companion across four tables. Powerful for genuine variety, heavy for
   simple cases. **Question: is the abstraction earning its keep across the real product
   range, or is most of it QSHS with a thin tail?**

4. **"Product-agnostic engine" leaks.** Geometry (panels, posts, corners, terminations)
   genuinely lives in engine code — only the *quantities/SKUs* are data. So it's
   "geometry-in-code, BOM-in-data," not fully data-driven. **Question: is that the right
   seam, and is it drawn consistently?**

5. **Per-system correctness is unproven.** The systems were seeded from supplier catalogues
   independently; only QSHS is validated. The static engine can't validate the others
   (it lacks real logic for some). **Question: what *is* the source of truth for
   correctness — the catalogue, a known-good example BOM, a domain expert? Parity-with-the-
   old-engine only works where the old engine was actually right.**

6. **Pricing model + platform gotchas.** Qty-break tiered pricing is reasonable, but the
   data volume is large (~18k pricing rows for a full catalogue) and a platform default
   (PostgREST `max_rows=1000`) silently truncated an unbounded pricing query → most items
   priced $0. Easy to miss; symptomatic of "data-driven means lots of rows + queries that
   must be written carefully."

7. **Versioning (`rule_sets`/`rule_versions`) adds machinery** that may or may not be
   exercised. **Question: is rule versioning a real requirement now, or speculative?**

**The meta-question to rubber-duck:** the bet is that suppliers/systems are added by
non-engineers editing data. Is that actually how it'll happen, and is the data model
simpler to author correctly than just writing a small, well-tested code module per product
behind a shared interface? The honest answer depends on how many products there'll be and
who maintains them.

## 8. A considered alternative — structured domain config instead of a rules engine

This is the live architectural question being rubber-ducked: **is the general-purpose
rules engine (§4–§5) the right tool, or would a simpler structured config — organised
around the physical domain — have far fewer moving parts?**

### The observation: the domain is *regular*
Every fence system in scope decomposes the same three ways:
- **what's in a panel** — slats (qty from height/gap), centre support rails, spacers,
  screws → all scale × number of panels
- **how a post fixes to the ground** — in-ground → grout; base-plate → base plate +
  domical cover + fixing kit; core-drill → dress ring → all scale × number of posts
- **how a section terminates** — system end → side frame + CFC + caps; wall → F-section;
  corner → angle adapter + screws

The current engine is a **general-purpose rules VM** (stage-ordered math.js + selectors +
companions + constraints + validations + variables + versioning) solving a problem that
has a **strong, fixed structure**. That mismatch is the root of most of the §7 pain.

### The proposed shape: one structured blob per product
```jsonc
{
  "system": "QSHS",
  "fields": [ /* height, slatSize, gap, colour, mounting, maxPanelWidth */ ],
  "panel": {
    "maxWidth": 2600,
    "vars": { "slats": "floor((height+gap-3)/(slat+gap))",
              "csr": "width<2000?0:width<4000?1:2" },
    "components": [
      { "sku": "XP-6100-S65-{colour}", "per": "panel", "qty": "slats", "stock": 6100 },
      { "sku": "QS-SPACER-{gap}MM-50PK", "per": "panel", "qty": "ceil(2*(slats-1)/50)" }
    ]
  },
  "post": {
    "sku": "XP-2400-FP-{colour}", "count": "internalJoins + nonSharedEnds",
    "mounting": {
      "in_ground":  [ { "sku": "GROUT-RSC", "qtyPerPost": 1.5 } ],
      "base_plate": [ { "sku": "XP-BP-SET-{colour}" }, { "sku": "XP-DC-2P-{colour}" },
                      { "sku": "{substrateKit}" } ]
    }
  },
  "terminations": {
    "system":     [ { "sku": "QS-5800-SF-{colour}", "perPanel": 2 },
                    { "sku": "QS-5800-CFC-{colour}" }, { "sku": "QS-SFC-B" } ],
    "wall":       [ { "sku": "QS-5800-F-{colour}" } ],
    "corner_135": [ { "sku": "XP-6000-135-{colour}" }, { "sku": "XP-SCREWS-{colour}" } ]
  },
  "gate": { /* sub-assembly */ }
}
```

### What it eliminates (the §7 pain)
- **Silent failures** — formulas are scoped to a section ("the panel formula can only see
  panel context"), so the "rule references a context variable the engine never provides →
  whole chain silently vanishes" class of bug largely disappears.
- **Indirection** — "side frame + its CFC + its caps" is one inline list under
  `terminations.system`, not a rule + a selector + two companion rows across four tables.
  Selectors collapse onto the component (`"sku": …`); companions become inline siblings.
- **Over-generality** — five variations on panel/post/termination don't need a rules VM.

### The reframe
This isn't "generic rules engine vs hardcoded static engine." It's a **middle path**: a
thin engine that owns the panel/post/termination **skeleton in code**, driven by a
structured blob that fills in **the SKUs and per-section quantity formulas**. That's
essentially *the static engine's clear domain decomposition, with the product-specific
numbers lifted out into data.* Note the current design already keeps geometry in code (the
engine injects panel/post/termination counts) — so it's *already* "geometry in code, BOM
in data"; this alternative just makes the data side stop pretending to be a general VM.

### What it gives up — the deciding question
A fixed schema is **less flexible**: a product that doesn't fit panel/post/termination, or
a novel termination type, needs a **schema + engine (code) change**, not just data. The
general VM can express the unanticipated. So the fork is **the real product range**:
- **Slat fencing systems + gates** (QSHS/VS/XPL/BAYG + gates) → all panel/post/termination
  → **structured wins decisively.**
- **Genuinely non-fence products** (patios/rafters, balustrades, letterboxes, equipment
  enclosures — there is an `other.json`) that don't decompose this way → a fence schema
  won't cover them; you'd need multiple schemas or keep the generic engine.

Caveat either way: the "non-engineers author new products in data" promise is *already*
weak — nobody non-technical is writing correct staged math.js across four tables. Novel
structure needs a developer in both models; the structured one is at least clear and safe
for the common case.

### Why it's low-risk to pursue
1. **The parity harness is engine-agnostic** — its scenarios + expected BOMs validate
   *any* engine. Build the structured engine alongside, run the same scenarios, prove
   byte-equivalence before switching. The QSHS reconciliation work becomes the spec, not
   sunk cost.
2. **Keep the good parts** — the canonical payload, the `product_components` catalogue, and
   qty-break tiered `pricing_rules` are fine as-is. What you'd retire is specifically the
   rules / selectors / companions / constraints / validations / variables / versions
   apparatus.
3. **Drop rule versioning until needed** (YAGNI) — git history of the JSON file is the
   version history.

### Tentative recommendation
For a slat-fencing domain, the simpler structured model is very likely the better call:
fewer moving parts, self-documenting, and it removes the worst bug class. **Resolve the
product-range question first** — it's the only real fork. If the range stays fence-shaped,
go structured; you can prove the new engine equivalent against the existing parity
scenarios before committing.

---

*Scope note: this describes QSHS (slat fence) + a shared pedestrian gate, which are
parity-verified. VS (vertical slat), XPL (clip system), and BAYG (infill panels) have
seeds but are not yet validated.*
