# Vendor Model, Quote Price Freezing & Multi-Installer Plan

> **Status: agreed direction, 2026-07-06.** Written up from an architecture discussion that re-examined the static-vs-data-driven question with the full history on the table (see [`docs/_deprecated/data-driven-approach/`](./_deprecated/data-driven-approach/) for the retired rules engine and its own §7–§8 post-mortem). This doc records the decisions and the plan; nothing here is implemented yet. The live-engine reference remains [`docs/configurable-static-calculator-plan.md`](./configurable-static-calculator-plan.md).

---

## 0. Decision summary

1. **The rules engine stays retired.** The structured-config static engine (`bom-calculator-static`) is the permanent architecture. We do not rebuild formulas-in-DB; the documented failure modes (silent stringly-typed evaluation, four-table indirection per line item, geometry living in code regardless, nobody-non-technical authoring formulas) all still apply — and the strongest new argument is collaboration safety: typed code config fails loudly in CI/PR diffs; DB rules fail silently in production quotes.
2. **The one-engine rule.** There is exactly one calculation path, forever. Every extension — new vendor, new fence family, experiment — plugs into that path through its existing seams (calculator registry, typed `CalculatorConfig`, DB override layer). Nothing is ever built *alongside* the engine to be reconciled later. The 2026 Q2 pain was not "data-driven vs static" so much as **two engines maintained in parallel**, one chasing parity with the other; that is the thing this rule forbids.
3. **Add a supplier (vendor) dimension** inside the org. Today the "supplier" axis is the org (tenant); the business reality is three roles: *manufacturer* → *supplier/vendor* (many per category, different SKUs/prices) → *provider/installer* (the tenant org). Supplier becomes a flat table of catalogue sources within an org — a **role, not a tier** — with Glass Outlet itself as the first row (it manufactures QuickScreen and merely supplies Colorbond).
4. **Freeze quote prices per line at save; make repricing explicit.** Today a saved quote silently reprices against the current catalogue the moment it is edited after reload. That is treated as a bug. Frozen lines now; full versioned price books deferred (the retired engine's `rule_versions` machinery was flagged YAGNI in its own post-mortem — don't rebuild it speculatively).
5. **Installer build-method variance is config, not code.** Multiple installers building (e.g.) a timber fence differently is handled by the *org overlay* over a single skeleton calculator — see § 3 and the timber worked example in § 6.

---

## 1. The three variance axes

The load-bearing model. When someone says "X does it differently", first classify *what* differs:

| Axis | What varies | Example | Where it lives |
|---|---|---|---|
| **Quote-time choice** | options the customer picks per quote | height, paling width, lapped vs butted, capping, colour, species | `config/products/<code>/fields.json` variables |
| **Installer build method** | how *this company* builds the system | post spacing, rails-per-height table, overlap mm, fixings per paling, concrete per post, which options are even offered | **org overlay** — `supplier_product_calculator_configs` row keyed by `org_id` (exists today) |
| **Vendor catalogue** | whose product it is | merchant SKUs, prices, stock lengths, pack sizes, colour availability, depot warnings | **supplier overlay** — new `supplier_id` dimension (§ 2) + `internal_sku` remap + `pricing_rules` |

Config resolution becomes:

```
effective config = BASE_CONFIGS[code] ⊕ org patch ⊕ supplier patch
```

using the existing `deepMerge` in `supabase/functions/bom-calculator-static/config/merge.ts` (scalars/arrays replace, objects merge). The org overlay may also patch `fields` — so an installer who never offers capping simply doesn't render the option.

**Escape-hatch discipline (unchanged):** when a variance genuinely cannot be expressed as parameters, the *calculator* grows a typed mode (the way `strategy.fence` already distinguishes `horizontal_slat`/`vertical_slat`/`panel`/`colorbond_sheet`) — tested, in code, behind the registry. Never a per-installer code fork; never expression strings in an overlay. **Warning sign the model is failing:** org/supplier patches wanting conditionals ("if height > X then …"). If that pressure becomes regular, revisit — from working code, not a rewrite.

---

## 2. Supplier as a role — schema & engine changes

### 2.1 Schema

```sql
-- suppliers = catalogue sources within an org. Flat; a role, not a tier.
CREATE TABLE suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  is_self    BOOLEAN NOT NULL DEFAULT false,  -- the org acting as its own source
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

ALTER TABLE product_components
  ADD COLUMN supplier_id UUID REFERENCES suppliers(id);  -- NULL = org default / self

ALTER TABLE supplier_product_calculator_configs
  ADD COLUMN supplier_id UUID REFERENCES suppliers(id);  -- NULL = org-level patch
```

- **Why a new table and not `organisations` with a `type` column** (considered and rejected): `organisations` is the tenancy/security boundary — every RLS policy and edge-function query scopes by `org_id = public.user_org_id()`. Vendor-as-organisation either breaks that (vendor rows invisible to the tenant's RLS) or degenerates into a self-join column, while creating pseudo-tenants that everything assuming organisations = tenants (signup trigger, profiles, future billing/enumeration) must remember to filter out — a silent wrong-set bug class. Vendor data is also inherently per-(tenant, vendor): two tenants buying from the same vendor have different prices/subsets, so the *relationship* is the entity, and a per-org `suppliers` table is that relationship. If a vendor ever becomes a first-class actor (own login, cross-org supply), add `suppliers.linked_org_id UUID NULL REFERENCES organisations(id)` — a bridge, not a merge.
- Seed one `is_self` row per org ("Glass Outlet"). QuickScreen components point at it (manufacturer-direct); Colorbond components point at whichever vendor rows exist.
- **Manufacturer is metadata** (a display/reporting column on `products` if wanted), never dispatch. Product geometry stays keyed by system (`COLORBOND` = one config, one calculator); vendors vary *facts* only. A vendor needing different *math* gets a new product code — the existing Scenario-A path in AGENTS.md § 11a, used rarely.
- RLS: same org-scoped pattern as everything else (`org_id = public.user_org_id()` read; service-role write until an admin surface exists).
- **Deferred, deliberately:** cross-org catalogue sharing (Glass Outlet supplying QuickScreen *to other tenant orgs*). The flat table doesn't block it; don't design it until it's real.

### 2.2 Payload & engine

- `CanonicalRun` gains optional `supplierId`. Resolution rule: a system with exactly one active supplier resolves silently (QuickScreen UX unchanged); the UI surfaces a vendor picker only when >1 supplier exists for the product.
- `loadCalculatorConfigs` merges base ⊕ org patch (`supplier_id IS NULL`) ⊕ supplier patch (matching run supplier).
- `resolveInternalSku` (`resolve.ts`) resolves per `(internal_sku, supplier_id)` instead of per org; pricing lookups scope `product_components`/`pricing_rules` rows to the run's supplier, falling back to the self/default rows.
- Mixed-vendor quotes fall out for free: supplier is run-scoped, the same way mixed-product quotes already work via run splitting (`expandSectionSystemOverrides`). Section-level supplier override is **deferred** until someone actually needs one fence run sourced from two vendors.
- Example fit: Jim's Fencing = a tenant **org** (provider) with Colorbond **supplier rows** in its catalogue and its own **org overlay** for build practices. No new concepts.

---

## 3. Frozen quote lines + explicit reprice

### 3.1 Current behaviour (the defect)

On save, the priced BOM summary is frozen into `quotes.bom` JSONB and the payload goes structurally into `quote_runs`/`quote_run_segments` — **without per-line prices**. On reload the snapshot displays and the first auto-recalc is suppressed (`CalculatorV3Page` + `suppressNextAutoBom`), but **any edit re-invokes the engine against the current catalogue and silently reprices every line**. A vendor price update therefore rewrites in-flight customer quotes the first time someone opens-and-touches them. With multiple vendors updating prices this gets worse, not better.

### 3.2 Plan

```sql
CREATE TABLE quote_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organisations(id),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  run_id      TEXT,             -- canonical runId (synthetic runs included)
  segment_id  TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  sku         TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  unit        TEXT,
  quantity    NUMERIC NOT NULL,
  unit_price  NUMERIC NOT NULL, -- frozen at save
  line_total  NUMERIC NOT NULL,
  priced_at   TIMESTAMPTZ NOT NULL
);
-- RLS mirrors quotes (org read, owner write).
```

- Save = replace-all lines for the quote (same delete-then-reinsert pattern as `replaceV3QuoteRuns`), plus `priced_at`. `quotes.bom` stays as the cheap list-view summary.
- Reload shows frozen lines. **Repricing is an explicit user action** ("Reprice against current catalogue") that recalculates, shows a diff (old vs new totals, changed lines), and only overwrites on confirm + re-save. Editing the fence layout naturally requires a recalc — but the UI must make it visible that prices moved, not swap them silently.
- **Deferred: versioned price books** (immutable catalogue versions pinned by quotes). Buys audit history at the cost of versioned writes on every price edit + version-aware engine lookups. Adopt only if an audit/compliance need materialises; frozen lines solve the customer-facing guarantee alone.

---

## 4. Timber fencing — the worked example (future family)

Marketing taxonomies (paling, lapped, lapped-and-capped, picket, hardwood/merbau slat) collapse into **one skeleton**:

```
posts at spacing ⊕ N horizontal rails ⊕ vertical boards at a coverage factor
⊕ optional plinth/kickboard ⊕ optional capping ⊕ footings
```

- Lapped vs butted = overlap parameter (overlap 0 = butted; palings/m = f(width − overlap)).
- Picket = same skeleton with a positive gap instead of an overlap (structurally the existing vertical-slat case).
- Rails count = height-threshold table (same shape as `csrThresholds`).
- Species/grade = finish family driving SKU selection.

**Implementation shape:** one `timber` strategy + `TimberConfig` block + `calculators/timber.ts` — the Colorbond playbook (typed config block, own calculator file, registry entry, seed JSON). Installer differences (rail counts, spacing, overlap, fixings, concrete) are **org overlays** per § 1; timber merchants' SKUs/prices are **supplier rows** per § 2. NOT one calculator per installer.

**Two things timber escalates:**

1. **Sloped ground / stepped runs stop being deferrable.** Zero slope handling exists anywhere today (grep-verified). Paling fences are the style most often raked/stepped; stepped bays change post heights and paling lengths per bay. Plan for stepping in the timber calculator's *first* version. (Stepping math is also quiet evidence for geometry-in-code — it would be miserable as data rules.)
2. **The long tail (chain wire, tubular, post-and-wire)** is each its own small skeleton *later*, isolated behind the registry. Do not pre-accrete fields into `TimberConfig` for them.

**`TimberConfig` requirements confirmed by real vendor data (§ 4a):** rails as a height-threshold ladder (e.g. 2 @1200 / 3 @1500–2100 / 4 @2400); an explicit **wastage factor** carried as a parameter (not baked into counts) so overlays can vary it; **lapped modelled as two layers with per-layer fixing rules** (paling count still falls out of the overlap parameter, but back vs front layers take different nails at different counts per rail); **species-conditional companions** (e.g. pine posts → rapid-set, hardwood posts → post-mix concrete) as one new typed `extraRules` type or a small config map — not expressions.

---

## 4a. First real-vendor test: Amazing Fencing (2026-07)

Amazing Fencing (AF) supplied component + BOM-by-height docs for their Colorbond panel and timber boundary paling systems — the first concrete second-vendor dataset. Verdict: **the model holds; no direction change.** What the data showed:

- **AF Colorbond maps onto the existing `colorbondCalculator` as a supplier overlay**, not a new product code: bay widths (2360/3100), 3 sheets/panel, a 5-step height ladder (1200–2400 @300mm, options mode), post-height-by-finished-height, SKU templates *without* a colour token (templates are data — omitting `{colour}` just works), 1 bag concrete/post, tier 1/2/3 prices straight into `pricing_rules`. **Decision: one `COLORBOND` code + AF supplier overlay first**; mint `AF_COLORBOND` only if the overlay starts wanting conditionals (the § 8 tripwire).
- **First real vendor *math* divergence, absorbed as a typed knob:** AF's post-cap rule is `ceil(posts/2)` vs GO's per-join-double + per-end-single. Add a `capRule` enum to `ColorbondConfig` (escape-hatch discipline: typed mode in code, never logic in the overlay). Watch the knob count per vendor — a climbing count is revisit-signal #1.
- **Cut-down stock is a config idiom:** finished sizes sourced by cutting longer stock (1200-high fence = 2.1m C-post cut down 300mm; 1500 pine post from 2400 stock). The finished→stock SKU ladder already expresses it; emit an assumption line ("cut down 300mm") so quotes are honest.
- **Genuine plan addition — catalogue gates:** AF sells pre-built gate bundles by width (0.9–2.1m single/double) + hardware kits, unlike the component-fabricated `QS_GATE`. Needs a small typed `catalogue_gate` strategy: snap opening to nearest bundle width, add hardware kit. Reusable for any vendor selling pre-made gates; slots behind the registry.
- **Classification note:** AF's build-method parameters (palings/bay incl. wastage, nails per layer) ride the **supplier overlay** if AF is a vendor within Glass Outlet's org, or the **org overlay** if AF were a tenant — same mechanism, which is exactly why supplier patches must carry method parameters, not just SKUs/prices.

---

## 5. Guardrails (do first — protects everything else)

The Q2 drift happened because an unsupervised collaborator could move the frontend while the engine chased parity. Mechanical enforcement, not social:

- **Branch protection on `master`** — PRs only, no direct pushes.
- **CI gate**: `npm run test:unit:static` + `npm run build` required to merge. The engine snapshot suite is the contract; an intentional snapshot change must be a visible, reviewed diff (`npm run test:unit:static:update`).
- Optional: CODEOWNERS on `supabase/functions/bom-calculator-static/**` so engine changes always get the owner's review.

---

## 6. Coupling paydown (background workstream)

From the coupling audit; each is small and independently shippable:

- Retire/align legacy product-code touchpoints: `src/schemas/fence.schema.ts` `SystemType` enum (already stale — no COLORBOND), the mounted XPL branch in `src/context/FenceConfigContext.tsx`, the `systemLabel()` if-chain in `src/lib/calculatorV3Helpers.ts`, `describeFenceParser.ts` / `ParsePreviewCard.tsx` hardcoded system lists, `localSeedData.ts` fixture arrays.
- Move client display names into the `products` table (it already carries `image_url`) so the five label maps in `src/lib/` stop being registration points.
- Decide a policy for the `chk_system_types_values` check constraint on `product_components` (migration 032 precedent) so new families don't each need a migration — e.g. drop the constraint in favour of seed-time validation. (This constraint is missing from AGENTS.md § 11a — doc gap.)
- **Shared-post counting defects** (engine): (a) adjacent fence segments in one run share no junction post — undercount of one per inter-segment junction (`2 boundary + Σ(Nᵢ−1) = ΣNᵢ`, one short of `ΣNᵢ+1`); (b) `expandSectionSystemOverrides` synthetic runs each count their own boundary posts — double-count at every mixed-product split. Both fixable in the run-aware calculators; note a per-section-formula engine could not see junctions at all.
- `src/lib/postSpacing.ts` clamps with hardcoded 100–3000 fallbacks and ignores `config.panelRules` min/max — align it with the resolved config so supplier overrides of spacing bounds reach the client.

---

## 7. Implementation order

| # | Work item | Depends on |
|---|---|---|
| 1 | Guardrails (branch protection, CI gate) | — |
| 2 | Frozen `quote_lines` + explicit reprice UX | — |
| 3 | `suppliers` table + `supplier_id` on components/config-overrides; engine merge + SKU/price resolution per supplier; vendor picker (multi-supplier systems only) | — |
| 4 | Onboarding surface: keep seed JSON + override rows (owner-operated) for now; supplier-facing UI starts as validated price/SKU editing over `product_components` only | 3 |
| 5 | Coupling paydown items (§ 6), interleaved | — |
| 6 | AF Colorbond onboarding: AF supplier row + component/pricing seeds + supplier overlay + `capRule` knob (§ 4a) | 3 |
| 7 | `catalogue_gate` strategy (pre-built gate bundles, § 4a) | 3 |
| 8 | Timber family (skeleton calculator + `TimberConfig` + stepping) when the business needs it | 3 recommended |

> **Status 2026-07-08 — items 6/7/8 delivered via the ORG overlay, not item 3.**
> Amazing Fencing was onboarded as a **tenant org** (`amazing-fencing`, per-org
> seed dir `supabase/seeds/amazing-fencing/`), resolving the § 4a classification
> question: its build parameters ride `supplier_product_calculator_configs`
> keyed by org — the "same mechanism" path. The § 2 `suppliers` table,
> `supplier_id` columns, and vendor picker remain **unbuilt** (they become
> relevant when one org carries two vendors of the same system).
> Delivered: `capRule` + cut-down-note + terminal-post knobs on
> `ColorbondConfig` (§ 4a); the catalogue-gate idea landed as
> `ColorbondConfig.gates` with `kit` (GO fabricated, catalogue p7/p17) and
> `bundle` (AF pre-built) modes under a `CB_GATE` fields product — a general
> `catalogue_gate` strategy can still be extracted when a non-Colorbond vendor
> needs it. Timber shipped as `TIMBER_PALING` (flat-ground v1, **no stepping**
> — deferred, contra § 4) with AF's parameters as the base config. § 3 frozen
> quote lines is still open: quotes saved before it will silently reprice AF
> Colorbond from $0 once its price list arrives.

## 8. Revisit signals (how we'd know this was wrong)

- Org/supplier overlay patches start needing **conditionals** faster than typed `extraRules` can absorb them → the facts-vs-logic split is leaking; reconsider a constrained rules layer.
- Every new family needs a **new calculator** (strategy proliferation) → the "regular domain" bet is failing.
- Supplier edit requests are dominated by **quantity-logic** changes rather than prices/SKUs/constants → vendors-as-config-overlay is too thin; product-code-per-vendor becomes the norm and the model should be re-cut.
- Vendors needing different *math* for the same manufacturer system (stronger form of the above) — same response.
