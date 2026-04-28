# Phase V3-7 — Docs: CLAUDE.md, tasks.md, how_it_works.md

> **Status:** Not started
> **Depends on:** V3-1 through V3-6 (so the docs reflect shipped reality, not intent)
> **Unblocks:** —

## Goal

Three documentation deliverables:

1. Update `CLAUDE.md` so future contributors (and future Claude sessions) correctly understand the v3 data-driven engine
2. Update `docs/tasks.md` so the v3 checklist joins the project's living task tracker
3. Write `docs/how_it_works.md` — a plain-English system explainer for non-engineers

## 1. CLAUDE.md updates

### Section 1 (Overview) — add

> The app now has **three routes serving three generations** of the calculator:
> - `/new` — legacy v1 single-system form (`MainApp`). QSHS/VS/XPL/BAYG with hand-coded edge function `calculate-bom`. Used for legacy quotes.
> - `/` — v2 multi-run `CalculatorPage` with `calculate-bom-v2` edge function.
> - `/calculator` — **v3** schema-driven calculator backed by the `bom-calculator` edge function. Rules, constraints, SKUs, companion items, form layout, and canvas actions all live in seeded tables. MVP scope: QSHS fence + QSHS_GATE pedestrian gate. Additional products (VS, XPL, BAYG, QSVS, QSGH, HSSG, patios) slot in via new seed rows without code changes.

### Section 3 (Project Structure) — add paths

- `supabase/functions/bom-calculator/` — v3 product-agnostic engine
- `src/components/calculator-v3/` — schema-driven form, multi-run UI, warnings panel, trace panel, achieved-height badge
- `src/pages/CalculatorV3Page.tsx` — `/calculator` route
- `src/hooks/useProductSchema.ts`, `useBomCalculator.ts`
- `src/types/canonical.types.ts`, `src/schemas/canonical.schema.ts`
- `src/components/canvas/canonicalAdapter.ts`
- `supabase/seeds/glass-outlet/qshs-v3-engine.sql`, `verify-v3-seeds.sql`

### New Section 5a — Engine Tables (v3)

> The v3 BOM engine is driven by 15 Postgres tables (migrations 011–018). All are multi-tenant via `org_id`. Most are service-role-only; the six needed by the client to render the schema-driven form have an `authenticated` SELECT policy.
>
> | Table | Purpose |
> |---|---|
> | `rule_sets` | Named containers of rules per product |
> | `rule_versions` | Versioned rule bundles; exactly one `is_current = true` per set |
> | `product_rules` | Stage-ordered math.js expressions (`derive` → `stock` → `accessory` → `component`) |
> | `product_constraints` | min/max/threshold/enum bounds for product variables |
> | `product_variables` | Field definitions, defaults, options, scope (job/run/segment) |
> | `product_validations` | Blocking / warning expressions (math.js) |
> | `product_component_selectors` | match-JSON → SKU pattern (supports `{colour}` placeholders) |
> | `product_companion_rules` | "X triggers Y" auto-add rules (CFC per side frame, hinges per gate) |
> | `product_warnings` | Non-blocking reviewer messages |
> | `product_input_schemas` / `_groups` / `_fields` | Schema-driven form definition |
> | `product_layout_schemas` / `_entity_types` / `_actions` | Canvas capabilities per product |
> | `input_aliases` | Natural-language → canonical-key mapping (global, no org_id) |
> | `quote_runs` / `quote_run_segments` | Persistent canonical payload for v3 quotes |
>
> Existing tables (`products`, `product_components`, `pricing_rules`) are reused. Variants live in `products.parent_id`; all SKUs live in `product_components` (a single source of truth); pricing lives in `pricing_rules` evaluated via math.js per-tier. See `docs/phase-v3-1-engine-migrations.md` for column details.

### Section 6 (Supabase Edge Functions) — add

> **`bom-calculator` (v3)** — `POST /functions/v1/bom-calculator`. Accepts `{ payload: CanonicalPayload, pricingTier? }`. Returns `{ lines, runResults, gateItems, totals, warnings, errors, assumptions, computed, trace?, pricingTier, generatedAt }`.
>
> Pipeline: load product + current rule_version → cache rules/constraints/selectors/companions/warnings → normalise variables via `input_aliases` → run validations (short-circuit on error) → evaluate rules in stage order (math.js, graceful on throw) → resolve SKUs via selectors (`sku_pattern` placeholder substitution) → expand companion rules → evaluate warnings → aggregate lines by SKU tagging `runId`/`segmentId`/`productCode` → price (last stage, non-fatal) → return.
>
> Trace is admin-gated (`profile.role = 'admin'`). Non-admins receive `trace: []` with only essential `computed` values (achieved height) retained.

### Section 8 (Canvas Layout Tool) — add

> The v3 route wraps the existing canvas engine unchanged. `LayoutCanvasV3.tsx` calls `canvasLayoutToCanonical(layout, productCode, variables)` to produce a `CanonicalPayload`, and `canonicalToCanvasLayout(payload)` in reverse for load/save. Canvas toolbar actions are seeded in `product_layout_actions` — the wrapper renders one button per row.
>
> `segmentId` and `runId` are stable across round-trips. Canvas, form, edge function, and `quote_run_segments` all key on them.

### Section 11 (Development Phases) — add

> Phases 0–6 complete (v1). Phase 7 (v1 polish) in progress.
>
> **v3 Engine phases** (tracked in `docs/tasks.md`):
> - V3-1 Engine migrations
> - V3-2 Seeds
> - V3-3 Canonical payload contract
> - V3-4 `bom-calculator` edge function
> - V3-5 Schema-driven UI
> - V3-6 BOM output
> - V3-7 Docs (this phase)

### Section 14 (Testing) — add

> v3 uses **Deno unit tests** (`supabase/functions/bom-calculator/index_test.ts`) with 8 scenarios covering rule firings, selector resolution, companion expansion, validation errors, warnings, missing pricing, and malformed rules. See `docs/phase-v3-4-bom-calculator.md`.
>
> Cypress v3 coverage is a follow-up phase. `SchemaDrivenForm` preserves `data-testid={field_key}` conventions so existing Cypress selectors keep working.

### Section 15 (Notes for Claude Code) — add

> - **v3 rules live in seed data, not code.** To change BOM calculation, edit `supabase/seeds/glass-outlet/qshs-v3-engine.sql` and run `npm run db:reset`. Do **not** edit `supabase/functions/bom-calculator/index.ts` unless you are changing engine framework behaviour (pipeline order, math.js safety, etc.)
> - **Adding a new product** = add seed rows. Minimum set: one `products` row, one `rule_sets` + `rule_versions`, the needed `product_variables`/`constraints`/`validations`/`rules`/`selectors`/`companion_rules`, and one `product_input_schemas` + `_groups` + `_fields` + `product_layout_schemas` + `_entity_types` + `_actions`. See `docs/how_it_works.md` §4.
> - **Admin trace access** requires `profiles.role = 'admin'`. The seeded `admin@glass-outlet.com / 123456` user has it. New users need a manual `UPDATE profiles SET role = 'admin' WHERE email = ...`.
> - **Never put pricing numbers, margin percentages, or wholesale costs in client-side code** — this rule applies to v3 identically. All pricing lives in `pricing_rules`.
> - **Legacy routes are untouched.** `/` (v2) and `/new` (v1) continue to work. Do not remove them until explicitly instructed — they may still be carrying production data.

## 2. tasks.md updates

Add a new section between Phase 7 and Notes:

```markdown
## v3 Engine (Schema-Driven BOM)

> See individual phase docs in `docs/phase-v3-*.md`. See `docs/how_it_works.md` for the plain-English overview.

| Phase | Title | Status |
|-------|-------|--------|
| V3-1 | Engine migrations | ⏳ Not started |
| V3-2 | QSHS + QSHS_GATE seeds | ⏳ Not started |
| V3-3 | Canonical payload contract | ⏳ Not started |
| V3-4 | `bom-calculator` edge function | ⏳ Not started |
| V3-5 | Schema-driven multi-run UI at `/calculator` | ⏳ Not started |
| V3-6 | BOM output (per-run tabs + trace panel) | ⏳ Not started |
| V3-7 | Docs (CLAUDE.md + tasks.md + how_it_works.md) | ⏳ Not started |

### V3-1 — Engine migrations
- [ ] Write migrations 011–019 per `docs/phase-v3-1-engine-migrations.md`
- [ ] Apply migrations locally (`npm run db:reset`)
- [ ] Verify all 15 new tables exist, triggers attached, admin role added
- [ ] RLS smoke-tested for `authenticated` vs `service_role`

### V3-2 — Seeds
- [ ] Generate fresh UUIDs for all CSV rows; store mapping comment block
- [ ] Write `qshs-v3-engine.sql` with all 19 ordered inserts (products → pricing_rules)
- [ ] Extend `seed-auth.js` with `admin@glass-outlet.com`
- [ ] Write `verify-v3-seeds.sql` row-count assertions
- [ ] `npm run db:reset` passes verification

### V3-3 — Canonical payload
- [ ] Write `canonical.types.ts` (shared + client)
- [ ] Write `canonical.schema.ts` Zod validators
- [ ] Write `canonicalAdapter.ts` (canvas ↔ canonical)
- [ ] Round-trip test: canvas layout → canonical → canvas layout deep-equal

### V3-4 — `bom-calculator`
- [ ] Write `supabase/functions/bom-calculator/index.ts` (12-step pipeline)
- [ ] Reuse `_shared/auth.ts`, `_shared/cors.ts`
- [ ] Port `resolvePrice`, `loadPricing`, `applyPricing`, `COLOUR_CODES` from `calculate-bom-v2`
- [ ] Write `index_test.ts` with 8 test cases (TC-V3-1 through TC-V3-8)
- [ ] Manual curl test with a QSHS 5m fixture

### V3-5 — Schema-driven UI
- [ ] Build `src/components/calculator-v3/*`
- [ ] Build `src/pages/CalculatorV3Page.tsx`
- [ ] Build `useProductSchema.ts`, `useBomCalculator.ts`
- [ ] Extend `CalculatorContext.tsx` with canonical payload actions
- [ ] Wire `/calculator` route in `src/App.tsx`
- [ ] SchemaDrivenForm renders QSHS + QSHS_GATE fields correctly
- [ ] Canvas ↔ form round-trip works
- [ ] Cypress `data-testid` conventions preserved

### V3-6 — BOM output
- [ ] Move `BOMResultTabs.tsx` → `src/components/shared/`
- [ ] Update v2 + v3 imports
- [ ] Build `BOMWarningsPanel.tsx`, `BOMTracePanel.tsx`, `AchievedHeightBadge.tsx`
- [ ] Verify all tab filters + recomputed totals work
- [ ] Admin-vs-non-admin trace gating confirmed in manual test

### V3-7 — Docs
- [ ] Update CLAUDE.md sections 1, 3, 5a, 6, 8, 11, 14, 15
- [ ] Write `docs/how_it_works.md` (1 page, plain English)
- [ ] Update `tasks.md` "Current Phase" header
```

Also update the header:

```markdown
## Current Phase

> **Phase 7 (v1 polish)** in progress — see checklist below.
> **v3 Engine** — not yet started; see `v3 Engine` section below.
```

## 3. how_it_works.md

Standalone file (see next phase doc task). Written for staff, junior engineers, future contributors. One printable page, no framework jargon.

## Verification

- `CLAUDE.md` renders cleanly as Markdown
- New sections 5a, 11 update, 14 update, 15 additions are visible
- `docs/tasks.md` has new v3 Engine section with all 7 phases as checklists
- `docs/how_it_works.md` exists, reads end-to-end in ~5 minutes
- All internal links between the three docs resolve (`docs/phase-v3-N-*.md`, CLAUDE.md §Nx)

## Out of scope

- Translating `CLAUDE.md` into other languages
- Auto-generated docs from seed rows (e.g., selector reference tables) — deferred
- Screencasts / video walk-throughs — deferred
