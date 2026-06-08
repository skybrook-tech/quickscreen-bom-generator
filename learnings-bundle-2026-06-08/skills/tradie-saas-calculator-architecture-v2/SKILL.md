---
name: tradie-saas-calculator-architecture-v2
id: cmozmr1rl0ab20cadmwttnykj
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# tradie-saas-calculator-architecture-v2

> Use when designing or refactoring the engine of a parametric calculator app that ingests supplier data and emits Bills of Materials. Triggers when the user wants to (a) lock the schema for a new tradie SaaS calculator (decking, paving, fencing, painting), (b) refactor the BOM dispatcher, (c) design seed data for a new supplier or system, (d) handle scope-attributed line items (per-source quantity tracking for filtering), (e) categorise BOM output for readable presentation, (f) bake in optional accessories with many-to-many parent links, (g) track calculation completeness with the 5-state status model, (h) enforce source discipline across multiple evidence sources. Captures the 3-layer schema (geometry / system / product attribute), the canonical 4-state rule taxonomy, per-SKU quantity-tier pricing, BB- bulk-buy variants, all the canonical math (slat+gap-3, gate weight + 30% safety, FFD bin-packing), scope-attributed line items, BOM categorisation taxonomy (category / subCategory / companionOf / sortPriority), the optional-accessory schema, and calculation-status tracking.

## When to use
(not specified)

## Documentation
# Tradie SaaS calculator architecture

The blueprint for building a parametric calculator app that ingests supplier price lists and emits Bills of Materials. Distilled from the QuickScreen BOM Generator. Generic; portable to any tradie SaaS calculator (decking, paving, fencing, painting, plumbing).

## The 3-layer schema

Three independent concerns separated by clean interfaces.

### Layer 1 — Geometry (universal)

The drawing tool's output: runs, segments, lengths, heights, gates, corners, end posts, terminations. Same shape for every trade. Same shape for every system within a trade. The geometry layer doesn't know about products; it knows about shapes.

```ts
type Geometry = {
  runs: Array<{
    id: string;
    nodes: Array<{ id: string; xMm: number; yMm: number }>;
    segments: Array<{ from: string; to: string; lengthMm: number; kind: 'fence' | 'gate' }>;
    corners: Array<{ atNode: string; angleDeg: number }>;
    terminations: Array<{ atNode: string; kind: 'post' | 'wall' | 'existing' | 'open' }>;
  }>;
};
```

### Layer 2 — System (dispatch)

Each system (QSHS / VS / XPL / BAYG / sliding gate / pedestrian gate, or for decking: composite-board / hardwood / softwood) is an attribute set with its own dispatcher. The system layer reads the geometry layer + product config and produces BOM line items by applying rules.

### Layer 3 — Product attribute (per-supplier seed JSON)

Per-supplier seed files describe products, prices, rules, compatibility. The system dispatchers read this layer to know what to emit.

The clean separation lets you add new systems without touching geometry, new suppliers without touching dispatchers, new dimensions without touching products.

## BOM rule taxonomy

The canonical 4-state classification (defined in `.claude/skills/glass-calc-project-manager/SKILL.md`):

| Rule | Behaviour |
|---|---|
| `auto_add` | Required for valid BOM. Emitted automatically. |
| `suggested` | Pre-calculated default. Renders as a line; user can accept or replace. |
| `optional` | NOT in BOM until user opts in. |
| `warning` | Constraint or decision flag. Not a line item. |

Define this taxonomy in your seed schema and apply it at the rule-engine layer. The naming carries discipline: "optional" specifically means "do NOT auto-add."

## Per-SKU quantity-tier pricing

Avoid the rigid `tier1=1.0, tier2=0.86, tier3=0.74` ladder. Real supplier pricing is per-SKU breakpoints:

```json
{
  "sku": "XP-DR-B",
  "tiers": [
    { "min_qty": 1,  "unit_price": 4.97 },
    { "min_qty": 10, "unit_price": 4.52 },
    { "min_qty": 40, "unit_price": 3.98 }
  ]
}
```

The BOM dispatcher picks the tier whose `min_qty` is the largest one ≤ requested qty. Each SKU has its own breakpoints; never compress them.

## BB- bulk-buy variants

Some SKUs have bulk-pack variants (10-32% cheaper per unit). Don't conflate with quantity tiers — BB- variants are separate SKUs:

```json
{
  "sku": "AW-2400-S65-B",
  "bulk_buy_variant": "BB-AW-2400-S65-B",
  "regular_price": 18.50,
  "bulk_price_per_unit": 14.20,
  "bulk_pack_size": 50
}
```

## Calculator math patterns

### Slat / board count from height
```
num_slats = floor(target_height / (slat_size + gap))
actual_height = round(num_slats × (slat_size + gap) - gap + 3)
```
The `+3` is end-cap allowance for QuickScreen. Adjust for the trade. The pattern (count, derive achievable, show user the gap between target and actual) is universal.

### Gate / panel weight estimation (with safety margin)
```
slat_weight    = num_slats × slat_unit_weight
frame_weight   = perimeter_mm × frame_unit_weight
hardware_lump  = 5    # kg lump for hinges + latch
total = (slat_weight + frame_weight + hardware_lump) × 1.30
```
30% safety margin. Apply at the dispatch layer when checking hinge ratings, post mount loads, etc.

### Stock-length cut nesting (FFD bin-packing)
For extrusions in fixed stock lengths (5800mm, 6100mm), use **First-Fit Decreasing**:
1. Sort cut requirements descending
2. For each cut, place in the first stock length that fits
3. Open new stock when none fit

Minimises waste on real-world cuts where mixed lengths come from one stock.

### Canvas math: DPR retina + snap resolutions
- Always scale canvas by `window.devicePixelRatio` for retina sharpness
- Snap to 1mm for line drawing, 100mm for gate placement
- Snap radius scales with zoom level

## Scope-attributed line items

(NEW — from Brief AU.1)

Don't merge SKUs across scopes (fence runs + gates + enclosures) into a single deduplicated row. Track every contributing source:

```ts
type BomLine = {
  sku: string;
  unitPrice: number;
  sources: Array<{
    scopeKind: 'fence_run' | 'gate' | 'enclosure' | 'global';
    scopeId: string;
    scopeLabel: string;
    qty: number;
  }>;
  totalQty: number;          // sum of sources for the unfiltered view
  category: BomCategory;     // see Categorisation below
  companionOf?: string;
  optionalChildOf?: string[];
};
```

Why: filtering the BOM to "just this gate" must show ALL items that gate needs — including slats also used by adjacent fence runs. Pricing the gate in isolation requires its portion of every shared SKU.

This pattern adds complexity at the dispatcher level but pays off as soon as users want filtered views (per-gate pricing, per-run summaries, partial-quote breakdowns).

## BOM categorisation taxonomy

(NEW — from Brief AU.2)

Every product entry carries:

```json
{
  "sku": "...",
  "category": "frames_and_covers",
  "subCategory": "cover_strips",
  "companionOf": "QS-5800-SF-B",
  "sortPriority": 20
}
```

| Field | Purpose |
|---|---|
| `category` | Top-level BOM section |
| `subCategory` | Cluster within section (all caps, all spacers, all cover strips) |
| `companionOf` | Renders directly beneath this parent in same scope; overrides sub-category clustering |
| `sortPriority` | Within sub-category, lower numbers first |

Render rules:
1. Group by `subCategory` within each `category`
2. Within sub-category, sort by `sortPriority`
3. **Companion override:** when `companionOf` is set and parent is in the same scope, render directly under parent (overrides sub-category clustering)

Examples of companion relationships:
- Side frame ↔ CFC cover ↔ SF cap
- Gate rail ↔ gate side frame ↔ infill extrusion
- Centre support rail ↔ CSR cap ↔ top/base plate
- Post ↔ base plate ↔ domical (when base-plated)

For another tradie SaaS, define equivalent: deck board ↔ joist ↔ joist hanger; or paver ↔ edge restraint ↔ jointing sand.

## Optional accessory schema

(NEW — from Brief AU.3)

Many-to-many relationship between optional accessories and parents:

```json
{
  "sku": "TC-SAFETY-CAPS-2PK",
  "isOptionalAccessory": true,
  "optionalChildOf": ["TC-H-AT-B", "TC-H-AT-2L-B", "TC-H-HD-B", "TC-H-HD-2L-B"],
  "qtyPerParent": 1
}
```

Dispatcher rules:
- `isOptionalAccessory: true` → exclude from auto_add
- Include only when user explicitly opts in via the inline picker at parent selection

UX rules: see `multi-option-suggestion-philosophy-v2` skill.

## Calculation status tracking

(NEW — from `.claude/skills/glass-calc-project-manager/SKILL.md`)

Track per-product calculation completeness with 5 states:

| State | Meaning |
|---|---|
| `not started` | Catalogue scoped; no implementation |
| `UI exposed only` | Form fields render but engine returns stub |
| `engine draft` | Dispatcher logic written; not validated |
| `spreadsheet compared` | Validated against source-of-truth spreadsheet |
| `user verified` | Domain expert (e.g. Liam) confirmed against real job |

Maintain this state per product/system in your project tracker (or `discovery.md`). Never ship `engine draft` calculators to production; require at minimum `spreadsheet compared`.

## Source discipline

From `.claude/skills/glass-calc-project-manager/SKILL.md` and `glass-calc-catalogue-extractor/SKILL.md`:

- Treat supplier catalogue/PDF, formulated spreadsheet, CSV price list, seed JSON, and app output as **separate evidence sources**
- Do not let the app invent SKUs, prices, or rules when source data is missing
- Mark `price_source` per SKU: `csv` / `catalogue` / `app_const` / `inferred`
- Conflicts between sources get **recorded**, not silently resolved
- The data extraction agent should record open questions (catalogue ambiguities) for the project manager / domain expert to resolve

## In the QuickScreen repo

- **`.claude/skills/quickscreen-bom/SKILL.md`** — full BOM workflow for QSHS, VS, XPL, BAYG, gates, sliding gates, equipment enclosures, POSTA letterboxes; contains the actual SKU patterns and stock-length tables
- **`.claude/skills/seed-mapper/SKILL.md`** — schema for `supabase/seeds/glass-outlet/products/*.json`; `npm run seed:products` upserter; business-key conventions (org_slug, product_system_type, rule_set_name); `allowedAngles` for canvas corner-snap; `stocks()` math.js helper
- **`.claude/skills/glass-calc-project-manager/SKILL.md`** — orchestration, calculation-status tracking, agent handoff template, rule taxonomy ownership
- **`.claude/skills/glass-calc-qa-tester/SKILL.md`** — regression testing methodology, evidence references, high-risk checks (stock optimisation, quantity-break tier selection, post counts by boundaries/corners/gates/walls)
- **`.claude/skills/glass-calc-catalogue-extractor/SKILL.md`** — catalogue → seed extraction matrix with rule_type per SKU
- **Brief AT** (`/agent/workspace/AT-supplier-price-seed-and-corrections.md`) — real-supplier-price seed brief with anomaly flags
- **Brief AU** — scope attribution + categorisation + optional accessories implementation
- **Brief AV/AW/AX** — natural-language entry surfaces (text, LLM, sketch)
- **Test corpus** `/agent/workspace/describe-fence-test-corpus.md` — natural-language entry contract

## Carry-forward checklist for the next tradie SaaS

1. Lock the 3-layer schema (geometry / system / product attribute) as the FIRST architectural decision
2. Define the 4-state rule taxonomy (`auto_add | suggested | optional | warning`) in seed schema
3. Use per-SKU quantity-tier breakpoints, not a fixed ladder
4. Detect bulk-buy variants in the supplier walk; track them as separate SKUs with parent linkage
5. Adopt scope-attributed line items from day 1 (refactoring later is painful)
6. Bake `category | subCategory | companionOf | sortPriority` into the seed schema
7. Bake `isOptionalAccessory | optionalChildOf` into the seed schema
8. Track calculation-status per product (5 states); never ship "engine draft" calculators to production
9. Treat each data source as separate evidence; never let one silently override another
10. Maintain a test corpus of canonical input → expected output for the natural-language entry layer
11. Mirror the 6-skill specialist team pattern: project manager, UI designer, QA tester, catalogue extractor, BOM workflow expert, seed mapper

## Scripts
None
