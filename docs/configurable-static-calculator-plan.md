# Configurable Static Calculator — Implementation Plan

> **Status:** Spike → staged build. This is the execution plan for evolving
> `bom-calculator-static` from a single hardcoded QuickScreen calculator into a
> **base static calculator + supplier overrides** architecture, with an
> internal/canonical SKU layer and per-run product routing.
>
> **Companion doc:** `docs/static-with-supplier-config-feasibility.md` (the spike report this builds on).
>
> **Hard constraints (unchanged):** keep the V3 frontend page as the product
> surface; keep `bom-calculator-static` as the trusted path; do NOT switch the
> frontend to the generic `bom-calculator` engine; do NOT make V4 primary.

---

## 0. Decisions locked in (from product owner)

These supersede the cautious recommendations in the feasibility report:

1. **Cut geometry IS in scope for overrides.** Stock lengths *and* cut offsets
   (`-86`, `-133`, `-80`, `-31`, `slatWidth+gap` divisors, etc.) must be
   overridable. Example driver: a supplier ships slats in **4000mm** stock
   instead of 6000mm; another uses a different frame deduction. The base
   calculator owns the *default* numbers; suppliers override only where they
   differ.
2. **Rules-engine "scope creep" is acceptable — by design.** We are building the
   **BASE calculators** in code. When a supplier diverges, we express the
   *difference* as an **override**, not a second full calculator. The goal is
   *fewer total rules to maintain*, not zero dynamism. The firewall from the
   feasibility report is relaxed: overrides may carry formulas, but they live in
   a constrained, versioned, well-tested override layer — not scattered `if`s.
3. **Canonical / internal SKU layer.** Product items get a generalized
   `internal_sku` (a.k.a. canonical SKU). Engine logic emits **internal SKUs**;
   a per-supplier mapping resolves them to that supplier's real SKUs at the end.
   This is what lets one calculator serve many suppliers.
4. **Colours move into data** (eventually). Start by externalising the colour
   sets/maps into config; later back them with a table.
5. **Per-run product mixing.** The canonical payload already supports a
   `productCode` per run (QSHS on run 1, Colorbond on run 2, …). The edge
   function must route **each run through its registered calculator**. For now
   there is exactly one calculator (QuickScreen), refactored into the new shape,
   but the registry must make adding a second trivial.
6. **Regression safety net comes first.** Before any refactor, lock current
   behaviour with unit/snapshot tests so we can prove "no logic regressions".

---

## 1. Guiding principles

- **Default config reproduces today exactly.** Every phase is gated by:
  *same input + default config === current static BOM*. The current engine is
  the oracle until the snapshot net says otherwise.
- **No new module-global state.** The engine currently holds `_components` /
  `_pricingRules` in mutable module globals set per-request by `initEngineData()`
  (engine.ts:359-369). In a reused Deno isolate this is a latent cross-request
  bleed risk. All new context (config, supplier SKU map, component/pricing data)
  must be **passed explicitly** through call arguments. Treat de-globalising the
  existing state as part of this work, not a separate someday-task.
- **Internal SKUs in the math, supplier SKUs at the edges.** The calculation
  core never sees a supplier-specific SKU string. Resolution happens once, at
  output assembly.
- **Overrides are sparse + versioned.** A supplier override is a deep-merge of a
  small JSON patch over the base config. Absent override ⇒ identical to base.
- **Layered tests.** Offline logic snapshots (no DB) lock geometry/quantities;
  seeded integration tests lock pricing. Override tests lock divergence.

---

## 2. Target architecture

### 2.1 Layers

```
                ┌─────────────────────────────────────────────┐
 frontend  ──►  │ CanonicalPayload (runs[] each with productCode)│
                └─────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌───────────────────────────────────────────────────────┐
 edge   │ index.ts: auth → load(components, pricing, configs)     │
 func   │           → ROUTER: per run → calculatorFor(productCode)│
        └───────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌───────────────────────────────────────────────────────┐
        │ Calculator (e.g. quickScreenCalculator)                 │
        │   geometry math (BASE rules, in code)                   │
        │   reads CalculatorConfig (stock lengths, offsets, packs,│
        │   thresholds, colours, defaults)                        │
        │   emits lines keyed by INTERNAL_SKU                     │
        └───────────────────────────────────────────────────────┘
                                   │
                                   ▼
        ┌───────────────────────────────────────────────────────┐
        │ Resolution stage (supplier-specific, at the edges)      │
        │   internal_sku → supplier sku  (per-org mapping)        │
        │   attach component metadata + price                     │
        │   aggregate, source, total, GST                         │
        └───────────────────────────────────────────────────────┘
```

### 2.2 Internal / canonical SKU layer

- Add `internal_sku` to `product_components` (and to the SeedComponent type).
- The engine's SKU-builder functions (`slatSkuFor`, `quickscreenSkuFor`,
  `gate*SkuFor`, `postSkuFor`, …) are rewritten to produce **internal SKUs**
  from a config-driven pattern, e.g. `SLAT.STD.65.{colour}` →
  `"SLAT-STD-65-B"`, not `"XP-6100-S65-B"`.
- A **resolver** maps internal SKU → supplier SKU using the org's components:
  - Primary: a component row whose `internal_sku` matches and whose
    `system_types`/org scope fits ⇒ use its real `sku`.
  - The mapping is data; the engine carries only internal SKUs.
- **Backwards compatibility:** seed each existing component with an
  `internal_sku` equal to a canonical name derived from its current sku, AND
  keep a `DEFAULT_INTERNAL_SKU_MAP` in code so the default org resolves to
  exactly today's real SKUs. Snapshot net proves equivalence.

> Why internal SKUs matter for cut geometry: when Supplier B uses 4000mm slat
> stock, the *internal* SKU `SLAT.STD.65.B` is unchanged; only (a) the resolved
> supplier SKU and (b) the `stockLengths.slat.standard` config value differ.
> The geometry formula stays one formula.

### 2.3 CalculatorConfig (base + override)

Two-part config, deep-merged per `(org, productCode)`:

- `BASE_CONFIG[productCode]` — in code, the oracle. Holds every number currently
  hardcoded: stock lengths, cut offsets, pack sizes, panel/post limits, CSR
  thresholds, mounting maps, warning thresholds, colour sets, defaults, and the
  internal-SKU pattern templates.
- `supplier override` — sparse JSON from DB, deep-merged over base.

See §6 for the proposed type (extends the feasibility-report shape with a
`geometry` section for the now-in-scope cut offsets).

### 2.4 Calculator registry + per-run routing

```ts
type Calculator = (
  ctx: CalcContext,             // config, internalSkuResolver, components, pricing
  run: CanonicalRun,
  payload: CanonicalPayload,
  sink: { warnings: string[]; computed: Computed },
) => QtyLine[];                 // lines keyed by INTERNAL sku

const CALCULATORS: Record<string, Calculator> = {
  QSHS: quickScreenCalculator,
  BAYG: quickScreenCalculator,   // same calc, different config/strategy key
  VS:   quickScreenCalculator,   // vertical strategy selected via config
  // COLORBOND: colorbondCalculator,  ← future, one new file + one config
};

function calculatorFor(productCode: string): Calculator {
  return CALCULATORS[productCode] ?? unsupportedCalculator(productCode);
}
```

`calculateLocalBom` iterates `payload.runs`, resolves config per run's
`productCode`, calls `calculatorFor(run.productCode)`, then runs the shared
resolution/aggregation/pricing stage across all runs' lines.

---

## 3. Phased implementation plan

Each phase is independently shippable and parity-gated.

### Phase 0 — Regression safety net (DO FIRST) ✅ start here

Goal: lock current logic so later refactors are provably non-regressive.

- Add `supabase/functions/bom-calculator-static/engine_test.ts`.
- Offline (no DB): import `calculateLocalBom` and exercise representative
  payloads against the engine's **synthetic** data. Deterministic ⇒ snapshot.
- Use Deno std `assertSnapshot`. Strip non-deterministic `generatedAt`.
- Cover the geometry/strategy branches (see §7 scenario matrix).
- Add `test:unit:static` npm script + update `test:unit` to include it.
- Commit the generated `__snapshots__` as the oracle.

Acceptance: `npm run test:unit:static` is green and snapshots are committed.

> **Note:** the runner uses `--no-check`. `engine.ts` has a pre-existing
> type-inference nit (`rec.recommended` at engine.ts:495/509 — `RankedHardware<T>`
> loses its optional `recommended` prop through `.map().sort()`; harmless at
> runtime, the function is deployed and works). We deliberately do NOT touch the
> engine during Phase 0 — the whole point is to lock behaviour before editing.
> Fix that type in Phase 1 (it's a type annotation, not logic) and drop
> `--no-check` then.
>
> **Status: COMPLETE.** `engine_test.ts` + `__snapshots__/engine_test.ts.snap`
> exist; `npm run test:unit:static` → `18 passed | 0 failed`. Scripts added:
> `test:unit:static`, `test:unit:static:update`, `test:unit:dd`, and `test:unit`
> now runs both suites.

### Phase 1 — Extract config surface (no behaviour change)

- Create `config/` module: `types.ts`, `base.qshs.ts` (BASE_CONFIG), `index.ts`.
- Add resolver helpers (`getStockLength`, `getCutOffset`, `getPackSize`,
  `getMaxPanelWidth`, `getCsrCountForPanel`, `getColourSuffix`,
  `getMountingKit`, `getWarningThresholds`, `getDefaults`) that **return today's
  literals** sourced from BASE_CONFIG.
- Replace inlined literals in `calculateScreenRun` /
  `calculateVerticalSlatRun` / `calculateGateSegment` with resolver calls,
  **one concern at a time** (colours → stock lengths → cut offsets → packs →
  thresholds → mounting). Pass `config` as an explicit arg (no globals).
- Parity gate after each concern: Phase 0 snapshots unchanged.
- De-duplicate the CSR ladder (currently in two places: engine.ts:1167 and
  :1348) into one config-driven helper.

### Phase 2 — Internal SKU layer

- Migration: add `internal_sku TEXT` to `product_components` (nullable, indexed).
- Seed: populate `internal_sku` for every existing component (authored in the
  per-product JSON seeds; see AGENTS.md §3).
- Engine: SKU builders emit internal SKUs from config patterns.
- Add `resolveInternalSku(internalSku, ctx) → supplierSku` + a
  `DEFAULT_INTERNAL_SKU_MAP` fallback so the default org resolves to today's
  real SKUs exactly.
- Resolution stage maps internal → supplier before metadata/pricing lookup.
- Parity gate: snapshots unchanged for the default org (resolved SKUs identical).

### Phase 3 — Calculator registry + per-run routing

- Extract the QuickScreen logic into `calculators/quickscreen.ts` exposing a
  `Calculator` function with the `CalcContext` signature.
- Add `calculators/registry.ts` (`CALCULATORS`, `calculatorFor`).
- `calculateLocalBom` becomes the orchestrator: per-run config + calculator,
  then shared resolution/aggregation/pricing.
- Strategy selection (horizontal/vertical/panel, swing/sliding gate) moves to a
  `config.strategy` key that picks an existing code path (VS no longer dispatched
  by a hardcoded `productCode === "VS"` check — it's config-selected).
- Parity gate: multi-run snapshot (QSHS + VS in one payload) matches the sum of
  the single-run snapshots.

### Phase 4 — Supplier overrides (storage + merge)

- Migration: `supplier_product_calculator_configs`
  (`org_id`, `product_code`, `config jsonb`, `version`, `is_current`, `active`,
  timestamps). RLS like `quotes`/engine tables. **Service-role read only** in
  the edge function — do NOT grant `authenticated` SELECT (it carries
  thresholds/strategy/offsets).
- JSON Schema `supabase/seeds/schemas/calculator-config.schema.json`; validate
  in the seed upserter.
- `loadCalculatorConfig(orgId, productCodes)` → `deepMerge(BASE, overrideRow)`.
- Author Supplier B (Colorbond) override as the first real test case:
  different prices/SKUs (via `internal_sku` map + pricing rows), colours, screw
  pack size, 4000mm slat stock, an extra-rail-above-1800 rule, different
  mounting kit.
- Tests: §8 override suite.

### Phase 5 — Colours into data

- Migration/seed: colour catalogue table (or a `colours` section on the config)
  with availability per `(org, product, kind)`.
- Engine reads colour availability/fallback/names from data, not constants.
- Parity gate: default colour set === current `STANDARD_COLOURS` etc.

### Phase 6 — Admin/supplier editing UI

- Expose the §9 (feasibility report) "safe" subset behind admin/supplier roles.
- Validate every edit against the JSON Schema + referential checks (internal
  SKUs resolve, colours map to components, numbers in range).
- Keep geometry offsets/strategy admin-or-developer gated.

---

## 4. Data model changes (summary)

| Phase | Change | Notes |
|---|---|---|
| 2 | `product_components.internal_sku TEXT` (nullable, indexed) | canonical SKU; seeded for all rows |
| 4 | `supplier_product_calculator_configs` table | JSONB override, RLS, service-role read |
| 5 | colour catalogue (table or config section) | availability per org/product/kind |

All new tables multi-tenant (`org_id`), RLS via `public.user_org_id()`. Configs
and colour-strategy are **not** client-readable.

---

## 5. Edge function shape (target)

```ts
// index.ts (sketch)
const productCodes = uniqueProductCodes(payload);
const [components, pricing, configs] = await Promise.all([
  loadDbComponents(admin, orgId),
  loadDbPricing(admin, orgId),
  loadCalculatorConfigs(admin, orgId, productCodes), // base ⊕ override per code
]);

const ctx = makeCalcContext({ components, pricing, configs, tier });
const result = calculateLocalBom(payload, ctx);     // routes per run internally
// suggestAccessories / computeGateHardwareHints unchanged for now
```

No module globals: `ctx` carries components, pricing, configs, and the internal
SKU resolver.

---

## 6. Proposed config type (extends feasibility shape with `geometry`)

```ts
type SkuPattern = string; // internal-sku template, e.g. "SLAT.{finish}.{slatSize}.{colour}"

type CalculatorConfig = {
  productCode: string;
  supplierId: string;
  configVersion: string;

  strategy: { fence: "horizontal_slat" | "vertical_slat" | "panel"; gate: "qsg_swing" | "qsg_sliding" };

  colours: { available: string[]; fallback: string; names: Record<string,string>;
             perKind?: { csrCap?: string[]; post?: string[]; gate?: string[] } };

  // internal SKU patterns (resolved to supplier SKUs downstream)
  internalSkus: {
    slat: { standard: SkuPattern; economy: SkuPattern; alumawood65: SkuPattern; alumawood90: SkuPattern };
    frame: { sideFrame: SkuPattern; cfc: SkuPattern; fSection: SkuPattern; csr: SkuPattern };
    post: { full: SkuPattern; hd65: SkuPattern; longFull: SkuPattern; longHd65: SkuPattern };
    gate: { rail65: SkuPattern; rail90: SkuPattern; sideFrame: SkuPattern; infill: SkuPattern;
            topCap: SkuPattern; screwCover: SkuPattern; spacer: SkuPattern };
    angleAdapter135: SkuPattern;
    screws: { slatFixing: string; xpFixing: SkuPattern };
  };

  stockLengths: { slat: { standard: number; economy: number; alumawood: number };
                  rail: { fence: number; gateHoriz: number; gateSliding: number };
                  frame: { sideFrame: number; gateFrame: number }; track: number };

  // NOW IN SCOPE: the cut deductions that were "code only" in the feasibility report
  geometry: {
    slatHeightDeduction: number;       // the "-3" in numSlats
    slatCutDeduction: number;          // panelWidth - 15
    sideFrameCutDeduction: number;     // actualHeight - 3
    csrCutDeduction: number;           // actualHeight - 6
    gate: { swingBladeHoriz: number;   // leafWidth - 86
            swingBladeVert: number;    // gateHeight - 133
            railCutDeduction: number;  // leafWidth - 80
            frameCutDeduction: number; // gateHeight - 31
            slidingBladeHoriz: number; // openingWidth - 86
            slidingBladeVert: number;  // gateHeight - 224
            /* …the remaining sliding offsets… */ };
  };

  packSizes: { slatScrews: number; xpScrews: number; spacers: number; economySlat: number; screwWasteFactor: number /*1.01*/ };

  panelRules: { maxPanelWidthMm: number; minPostSpacingMm: number; maxPostSpacingMm: number;
                csrThresholdsMm: Array<{ underMm: number; csrPerPanel: number }> };

  postRules: { inGroundShortPostMaxHeightMm: number; longPostThresholdMm: number; sizesMm: number[] };

  mountingRules: { inGround: { fixingInternalSku: string; bagsPerPost: number };
                   basePlate: { timberKitInternalSku: string; concreteKitInternalSku: string };
                   coreDrill: { dressRing: boolean } };

  terminationRules: { productPostSideFrames: number; wallFSections: number };

  // overrides MAY carry richer rules here (accepted scope creep, but constrained + tested)
  extraRules?: Array<
    | { id: string; type: "extra_component_above_height"; internalSku: string; aboveHeightMm: number; qtyPerPanel: number }
    | { id: string; type: "warning"; when: { field: string; op: ">"|">="|"<"; value: number }; message: string }
  >;

  defaults: { slatSizeMm: number; slatGapMm: number; targetHeightMm: number;
              postSizeMm: number; finishFamily: string; colour: string; mountingType: string };
};
```

`extraRules` is the controlled home for accepted scope creep: a small, typed,
discriminated-union list — NOT free-form expression strings. New rule *types*
are added in code (with tests); suppliers only parameterise existing types.

---

## 7. Phase 0 scenario matrix (the regression net)

Each is a hand-built `CanonicalPayload` snapshotted via `assertSnapshot`
(see `engine_test.ts`). Covers every geometry/strategy branch that later phases
touch:

| # | Scenario | Exercises |
|---|---|---|
| S01 | QSHS 10m straight, 65/9, black, in-ground, 1800 | baseline horizontal slat, posts, screws, GST |
| S02 | QSHS 90mm slats | `designSlatWidthMm`, slat SKU 90 branch |
| S03 | QSHS base_plate mounting | base plate + domical + fixing kit |
| S04 | QSHS core_drill mounting | dress ring + fixing kit |
| S05 | QSHS wall terminations both ends | F-section, side-frame omission, screws |
| S06 | QSHS custom corner (110°) | warning + CUSTOM-ANGLE-CORNER + adapter path |
| S07 | QSHS economy slats | `XP-6500-E65`, pack-of-96 rule, waste note |
| S08 | QSHS alumawood (KWI) | AW SKU stems, alumawood stock length |
| S09 | QSHS wide panel split (8m) | internal posts, CSR thresholds, multi-panel |
| S10 | QSHS louvre treatment 65mm | louvre brackets, screw suppression |
| S11 | VS vertical run | `calculateVerticalSlatRun` path |
| S12 | BAYG panel | `isBayg` panel-qty + spacer-each path |
| S13 | Single swing gate (QSG) | gate blades, frame kit, hinge/latch defaults |
| S14 | Double swing gate | leafCount 2, drop bolt default |
| S15 | Sliding gate + automation | track, wheels, motor, CSR>3000 |
| S16 | Multi-run: QSHS run + VS run in one payload | per-run handling (pre-routing baseline) |
| S17 | tier2 + tier3 pricing on S01 | tier fallthrough in `priceForSku` |

> Snapshots are taken against **synthetic** data, so DB-only SKUs price at 0.
> That's fine: Phase 0 locks *logic* (quantities, SKUs, units, notes, computed,
> warnings, totals math). Pricing correctness is locked separately by seeded
> integration tests (Phase 1+ optional tier).

---

## 8. Testing strategy (layered)

1. **Offline logic snapshots (Phase 0, CI-friendly):** `engine_test.ts`, no DB.
   The primary regression oracle. Update with `-- --update` only on intentional
   change, and review the diff.
2. **Resolver unit tests (Phase 1):** each `get*` returns the BASE value, e.g.
   `getCsrCountForPanel(3500, BASE) === 1`, `getStockLength('slat', {finish:'economy'}, BASE) === 6500`.
3. **Internal-SKU equivalence (Phase 2):** for the default org, every emitted
   internal SKU resolves to the exact supplier SKU the engine produced pre-refactor.
4. **Per-run routing (Phase 3):** multi-run payload output === concatenation of
   single-run outputs; registry returns the right calculator.
5. **Override suite (Phase 4):** `SUPPLIER_B_CONFIG` fixture proving:
   - different price → new line total
   - different `internal_sku`→sku map → different supplier SKU, same quantity
   - dropped colour → fallback applied
   - 4000mm slat stock → more slat stock lengths ordered (geometry override works)
   - extra-rail-above-1800 `extraRules` entry → extra line appears only >1800
   - different mounting kit → different fixing SKU
6. **Config validation (Phase 4):** malformed/partial override → schema rejects;
   deep-merge over base never yields `undefined` in required fields.
7. **Integration (optional, seeded DB):** the existing `fixture_runner` pattern
   for end-to-end pricing via the live edge function.

Proof obligations:
```
same input + default config            === current static BOM   (tests 1–4)
same input + Supplier B override config === expected Colorbond BOM (test 5)
```

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Refactor silently changes rounding/order | Phase 0 snapshots + one-concern-at-a-time + old-vs-new diff |
| Module-global state bleed worsens | De-globalise: pass `ctx` explicitly; remove `initEngineData` mutation |
| Override layer becomes unmaintainable free-form rules | `extraRules` is a typed discriminated union; new types need code+tests |
| Internal-SKU map gaps → 0-price / missing lines | `DEFAULT_INTERNAL_SKU_MAP` fallback + equivalence test (test 3) |
| Config/strategy leaking to client | Service-role-only table; never `authenticated` SELECT |
| Supplier "Colorbond" is really a new system | Registry supports a new calculator file; accept that as dev work |
| Snapshot brittleness (noise) | Snapshot a trimmed projection (sku/qty/unit/price/notes/computed/warnings), strip `generatedAt` |

---

## 10. Overnight execution checklist (ordered)

Work top-to-bottom; do not start a phase until the previous parity gate is green.

- [x] **P0.1** Add `engine_test.ts` with scenarios S01–S17 (§7). ✅ 18 tests (S01–S17b).
- [x] **P0.2** Generate snapshots (`npm run test:unit:static:update`), eyeball for sanity. ✅ committed at `__snapshots__/engine_test.ts.snap`.
- [x] **P0.3** Re-run without `--update`; confirm green. ✅ `18 passed | 0 failed`.
- [x] **P0.4** Add `test:unit:static` script; fold into `test:unit`. ✅ also `test:unit:dd`, `test:unit:static:update`.
- [ ] **P1.1** Create `config/types.ts` + `config/base.qshs.ts` (BASE = current literals).
- [ ] **P1.2** Add resolver helpers returning BASE values; unit-test them.
- [ ] **P1.3** Thread `config` through the three calc functions, one concern at a
      time (colours → stock lengths → cut offsets → packs → thresholds →
      mounting). Snapshot-gate after EACH concern.
- [ ] **P1.4** De-dupe CSR ladder into one helper.
- [ ] **P2.1** Migration: `product_components.internal_sku`.
- [ ] **P2.2** Seed internal SKUs for existing components.
- [ ] **P2.3** SKU builders emit internal SKUs; add resolver + default map.
- [ ] **P2.4** Equivalence test; snapshot-gate.
- [ ] **P3.1** Extract `calculators/quickscreen.ts`; add `registry.ts`.
- [ ] **P3.2** `calculateLocalBom` orchestrates per-run via registry.
- [ ] **P3.3** Move VS/gate strategy selection to `config.strategy`.
- [ ] **P3.4** Multi-run routing test; snapshot-gate.
- [ ] **P4.1** Migration + RLS: `supplier_product_calculator_configs`.
- [ ] **P4.2** JSON Schema + seed upserter validation.
- [ ] **P4.3** `loadCalculatorConfigs` deep-merge; wire into `index.ts`.
- [ ] **P4.4** Author Supplier B override; write override suite (test 5).
- [ ] **P5** Colours → data (parity-gated).
- [ ] **P6** Admin editing UI for safe fields.

> If blocked on a DB/migration step overnight, skip to the next code-only step
> (config/resolvers/registry are all doable without a DB) and leave a clear
> TODO + failing-but-skipped test describing the gap. Never leave the snapshot
> suite red.

---

## 11. Open questions (carry forward)

1. "Extra rail above 1800mm": pure quantity bump of an existing internal SKU, or
   an assembly change (screw counts, CSR interaction)? Determines whether one
   `extraRules` type covers it or it needs a code hook.
2. Internal SKU naming convention — dot vs dash, and how granular (does
   `SLAT.STD.65` need colour baked in or appended at resolve time?).
3. Should `pricingTier` ever come from the payload, or stay JWT-resolved?
   (The hook accepts it but never sends it today.)
4. Per-`(org, product)` config only, or also per-`(org, product, finishFamily)`?
   Alumawood vs standard differ enough to ask.
5. Are the synthetic fallback components (engine.ts:136-356) supplier-neutral, or
   do they encode Glass-Outlet catalogue a second supplier must NOT inherit?
6. Config↔engine version compatibility: pin `configVersion` against engine
   version and reject mismatches?
