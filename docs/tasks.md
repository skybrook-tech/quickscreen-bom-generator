# QuickScreen BOM Generator — Task Tracker

## Current Phase

> **Phase 7 (v1 polish)** in progress — see v1 checklist below.
> **v3 Engine** — V3-1 through V3-6 complete. V3-7 (docs cross-linking) is the only remaining item.
> Start here for an overview: [`docs/how_it_works.md`](./how_it_works.md).

---

## Phases Overview

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Cypress Test Suite | ✅ Complete |
| 1 | Foundation | ✅ Complete |
| 2 | Fence Configuration | ✅ Complete |
| 3 | Gate Configuration | ✅ Complete |
| 4 | BOM Engine (Edge Functions) | ✅ Complete |
| 5 | Quotes & Export | ✅ Complete |
| 6 | Canvas Layout Tool | ✅ Complete |
| 7 | Polish (v1) | 🔄 In progress |
| V3-1 | Engine migrations | ✅ Complete |
| V3-2 | QSHS + QSHS_GATE seeds | ✅ Complete |
| V3-3 | Canonical payload contract | ✅ Complete |
| V3-4 | `bom-calculator` edge function | ✅ Complete |
| V3-5 | Multi-run UI at `/calculator` (form + canvas are hand-coded, shared across fencing systems) | ✅ Complete |
| V3-6 | BOM output (per-run tabs + trace panel) | ✅ Complete |
| V3-7 | Docs (CLAUDE.md + tasks.md + how_it_works.md) | 🔄 In progress |

---

## Phase 0 — Cypress Test Suite

> See [phase-0-cypress-tests.md](./phase-0-cypress-tests.md)

- [x] Install Cypress and TypeScript support
- [x] Create `cypress/support/selectors.ts` (data-testid abstraction layer)
- [x] Create `cypress/support/helpers.ts` (`fillFenceConfig`, `addGate`, `generateBom`, `assertBomLine`, `assertGrandTotal`, etc.)
- [x] Create pricing fixture files (`tier1.json`, `tier2.json`, `tier3.json`)
- [x] Create test files TC1–TC10 (BOM line items & accessory quantities)
- [x] Create test files TC11–TC19 (pricing tiers, colour switching, system type, post count)
- [x] Create test files TC24–TC26 (edge cases)
- [x] Add `data-testid` attributes to existing HTML app (non-destructive)
- [x] Run suite against existing HTML app — TC1 and TC5 pass; failures documented
- [x] Document all other failures (test bug vs app bug) → `docs/cypress-test-report.md`

---

## Phase 1 — Foundation

> See [phase-1-foundation.md](./phase-1-foundation.md)

- [x] Scaffold Vite + React + TypeScript
- [x] Install and configure Tailwind CSS (v3 with PostCSS)
- [x] Install all dependencies (Supabase, TanStack Query, React Hook Form, Zod, React Router, Lucide, etc.)
- [ ] `supabase init` + `supabase start` (local dev stack) *(requires Supabase CLI install)*
- [x] Write migration `001_create_organisations.sql` + seed Glass Outlet org
- [x] Write migration `002_create_profiles.sql` (profiles table, `auth.user_org_id()` helper, signup trigger)
- [x] Write migration `003_create_quotes.sql` (quotes table + RLS policies)
- [x] Write migration `004_create_pricing.sql` (product pricing, no RLS)
- [x] Write migration `005_create_products.sql` (top-level products — fence systems and gate products, no RLS)
- [x] Write migration `006_create_product_components.sql` (component catalog — individual SKUs/hardware, no RLS)
- [ ] Apply all migrations *(requires Supabase CLI)*
- [x] Set up `src/lib/supabase.ts` and `src/lib/queryClient.ts`
- [x] Configure Tailwind theme (brand colours)
- [x] Build `AppShell.tsx`, `Header.tsx`
- [x] Set up React Router with routes: `/login`, `/`
- [x] Build `LoginForm.tsx` and `SignUpForm.tsx`
- [x] Build `AuthGuard.tsx` (redirect unauthenticated users)
- [x] Implement `useAuth.ts` hook
- [ ] Verify login → main app and logout → login page redirect *(requires Supabase running)*

---

## Phase 2 — Fence Configuration

> See [phase-2-fence-configuration.md](./phase-2-fence-configuration.md)

- [x] Write `src/schemas/fence.schema.ts` (Zod)
- [x] Build `FenceConfigContext.tsx` with reducer and business rule enforcement
- [x] Build `FenceConfigForm.tsx` (React Hook Form + Zod)
- [x] Build `ColourSelect.tsx` (with limited-availability flag)
- [x] Build `SlatSizeSelect.tsx`
- [x] Build `SlatGapSelect.tsx`
- [x] Build `AccordionSection.tsx`, `FormField.tsx` shared components
- [x] Enforce XPL → 65mm slat rule in reducer and form (watch + setValue)
- [x] Verify form validates with Zod before submission (zero TypeScript errors, clean Vite build)
- [x] Wire `FenceConfigForm` into `MainApp.tsx` inside `AccordionSection`
- [x] Build `src/lib/constants.ts` — all reference data: SYSTEM_TYPES, COLOURS, SLAT_SIZES, SLAT_GAPS, PANEL_WIDTHS, POST_MOUNTINGS, TERMINATIONS, gate constants

---

## Phase 3 — Gate Configuration

> See [phase-3-gate-configuration.md](./phase-3-gate-configuration.md)

- [x] Write `src/schemas/gate.schema.ts` (Zod)
- [x] Write `src/types/gate.types.ts`
- [x] Build `GateContext.tsx` with reducer
- [x] Build `GateTypeSelect.tsx`
- [x] Build `GateForm.tsx` (individual gate)
- [x] Build `GateList.tsx` (summary of all configured gates)
- [x] Build `GateConfigPanel.tsx` (section wrapper)
- [x] Implement "Match Gate to Fence" toggle (height/colour/slat fields default to match-fence)
- [x] Implement add gate flow
- [x] Implement edit gate flow
- [x] Implement remove gate flow
- [x] Add warnings for post sizes that require stock confirmation

---

## Phase 4 — BOM Engine (Edge Functions)

> See [phase-4-bom-engine.md](./phase-4-bom-engine.md)

- [x] Create `supabase/functions/_shared/cors.ts`
- [x] Create `supabase/functions/_shared/auth.ts`
- [x] Create `supabase/functions/_shared/types.ts`
- [x] Implement `calculate-bom` edge function — full QSHS BOM engine (panel layout, posts, slats, rails, brackets/accessories, gate BOM)
- [x] Implement `calculate-bom` edge function — system-specific rules (QSHS, VS, XPL, BAYG)
- [x] Implement `calculate-pricing` edge function (reprice existing BOM by tier)
- [x] Seed `product_pricing` table (migration 007 — all SKUs × 3 tiers × 11 colours)
- [x] Build `useBOM.ts` hook (TanStack Query mutation → `calculate-bom` edge function)
- [x] Build `src/types/bom.types.ts`
- [x] Build `BOMDisplay.tsx` (table with fence/gate/all filter)
- [x] Build `BOMLineItem.tsx` (with correct data-testid attributes)
- [x] Build `BOMSummary.tsx` (subtotal, GST, grand total with data-testid="bom-grand-total")
- [x] Build `PricingTierSelect.tsx` (data-testid="pricing-tier")
- [x] Wire BOM accordion into MainApp (conditional on mutation result)
- [x] Add `data-testid="match-gate-to-fence"` checkbox to GateForm
- [ ] Run Supabase CLI + apply migrations + verify TC1 and TC5 pass *(requires Supabase running)*

---

## Phase 5 — Quotes & Export

> See [phase-5-quotes-and-export.md](./phase-5-quotes-and-export.md)

- [x] Write `src/schemas/quote.schema.ts` and `src/schemas/contact.schema.ts`
- [x] Write `src/types/quote.types.ts`
- [x] Build `useQuotes.ts` hook (TanStack Query — list, save, load, delete, invalidate)
- [x] Build `SavedQuotesList.tsx` (slide-in panel, load + delete actions)
- [x] Build `QuoteActions.tsx` (Save, Load, PDF, CSV, Copy, Print buttons)
- [x] Build `QuotePDFTemplate.tsx` (@react-pdf/renderer — fence spec, gates, BOM table, totals)
- [x] Build `ContactDeliveryForm.tsx` (name, company, phone, email, fulfilment, delivery address)
- [x] Build `JobSummary.tsx` (live panel + gate count preview)
- [x] Implement CSV export (Papaparse — all BOM items + grand total row)
- [x] Implement PDF download (react-pdf blob → anchor click)
- [x] Implement clipboard copy (tab-separated for Excel/Sheets paste)
- [x] Build print stylesheet (`@media print` in index.css)
- [x] Build `QuoteViewPage.tsx` at `/quote/:id`
- [x] Add `/quote/:id` route to App.tsx + QueryClientProvider
- [x] `handleLoadQuote` in MainApp repopulates fence config, gates, BOM, contact, notes
- [x] App.tsx wraps entire tree in QueryClientProvider

---

## Phase 6 — Canvas Layout Tool

> See [phase-6-canvas-layout-tool.md](./phase-6-canvas-layout-tool.md)

- [x] Extract canvas drawing code from existing `index.html`
- [x] Port into `src/components/canvas/canvasEngine.ts` (pure TS, no React)
- [x] Implement `initCanvasEngine()` with full public API (`destroy`, `getLayout`, `setTool`, `undo`, `clear`, etc.)
- [x] Port grid snap logic
- [x] Port pan & zoom (scroll = zoom, right-drag = pan)
- [x] Port undo stack
- [x] Port segment label editing (click label to edit real-world length)
- [x] Port gate marker placement on segments
- [x] Port Google Maps tile underlay logic
- [x] Build `FenceLayoutCanvas.tsx` React wrapper (`useRef` + `useEffect`)
- [x] Build `CanvasToolbar.tsx` (Draw, Gate, Move, Undo, Clear buttons)
- [x] Build `MapControls.tsx` (address search, opacity slider, map type)
- [x] Wire "Use This Layout →" → dispatch to `FenceConfigContext` and `GateContext`
- [x] Verify canvas event listeners are cleaned up on unmount
- [x] Hide canvas section on mobile breakpoint

---

## Phase 7 — Polish

> See [phase-7-polish.md](./phase-7-polish.md)

- [x] Audit all components for dark theme consistency — fixed `hover:bg-white/5` → `hover:bg-brand-border/40` in AccordionSection
- [x] Add loading spinners/skeletons to all async operations — Loader2 spinner on BOM pending state
- [x] Add React Error Boundaries to BOM display and canvas sections — `ErrorBoundary` wraps both
- [x] Add toast notifications (quote save, clipboard copy, CSV download, auth errors, edge function errors) — sonner installed, toasts on save/copy/csv/bom-error
- [ ] Responsive audit: mobile form-only mode, tablet canvas, desktop full layout
- [ ] Verify canvas has no memory leaks (mount/unmount in dev tools)
- [ ] Verify BOM re-pricing (tier switch) does not re-trigger edge function
- [ ] Check for unnecessary React re-renders caused by canvas updates
- [ ] Run full Cypress suite (all 23 test cases) on production build
- [ ] Complete security checklist (see phase-7 doc)
- [ ] Move GitHub repo to private

---

## v3 Engine (Schema-Driven BOM)

> See spec docs in `docs/phase-v3-*.md`. One-page overview at [`docs/how_it_works.md`](./how_it_works.md).
> Scope: QSHS fence + QSHS_GATE pedestrian gate. v1/v2 routes (`/new`, `/`) remain untouched.

### V3-1 — Engine migrations
> See [phase-v3-1-engine-migrations.md](./phase-v3-1-engine-migrations.md)
- [x] Write migrations 011–014, 018, 019 (rule_sets, rule_versions, product_rules, constraints, variables, validations, selectors, companion rules, warnings, quote_runs/segments, admin role)
- [x] Scope reduction: migrations 015 (form schema), 016 (layout schema), 017 (input_aliases) dropped — fencing-only product surface means form + canvas are hand-coded and shared across systems
- [ ] Apply migrations locally (`npm run db:reset`) *(requires Supabase running)*
- [ ] Verify all new tables exist, `touch_updated_at` triggers attached, `admin` enum value added *(requires Supabase running)*
- [ ] RLS smoke-tested *(requires Supabase running)*

### V3-2 — QSHS + QSHS_GATE seeds
> See [phase-v3-2-seeds.md](./phase-v3-2-seeds.md)
- [x] Write `supabase/seeds/glass-outlet/v3-qshs-engine.sql` with ordered inserts (products → components → rule_sets → rule_versions → constraints → variables → validations → rules → selectors → companion rules → warnings → pricing_rules)
- [x] Extend `supabase/seeds/seed-auth.js` to create `admin@glass-outlet.com` / `123456` with `role = 'admin'`
- [x] Write `supabase/seeds/glass-outlet/v3-verify-seeds.sql` row-count assertions
- [x] Add QSHS_GATE-specific rules (133mm structural offset, slat cut = width − 86, rail cut = width − 80, side frame cut = height − 3)
- [x] Scope reduction: form-schema inserts (product_input_*), layout-schema inserts (product_layout_*), and input_aliases inserts dropped alongside migrations 015/016/017
- [ ] `npm run db:reset` passes `v3-verify-seeds.sql` *(requires Supabase running)*

### V3-3 — Canonical payload contract
> See [phase-v3-3-canonical-payload.md](./phase-v3-3-canonical-payload.md)
- [x] Write `supabase/functions/_shared/canonical.types.ts` (CanonicalPayload, Run, Segment, Boundary, Corner)
- [x] Mirror at `src/types/canonical.types.ts`
- [x] Write `src/schemas/canonical.schema.ts` Zod validators
- [x] Write `src/components/canvas/canonicalAdapter.ts` (canvasLayoutToCanonical + canonicalToCanvasLayout)
- [ ] Round-trip test: canvas layout → canonical → canvas layout deep-equal *(manual test pending)*

### V3-4 — `bom-calculator` edge function
> See [phase-v3-4-bom-calculator.md](./phase-v3-4-bom-calculator.md)
- [x] Create `supabase/functions/bom-calculator/index.ts` (12-step pipeline)
- [x] Reuse `_shared/auth.ts`, `_shared/cors.ts`
- [x] Port `resolvePrice`, `loadPricing`, `COLOUR_CODES` from `calculate-bom-v2`
- [x] Admin trace gating (`role === 'admin'` → full trace; else `trace: []` + minimal computed)
- [x] Graceful math.js failure handling (try/catch per rule, log to trace, skip on failure)
- [ ] Write `index_test.ts` with 8 fixtures (TC-V3-1 through TC-V3-8) *(deferred)*
- [ ] Manual curl test with QSHS 5m payload *(requires Supabase running)*

### V3-5 — Multi-run UI at `/calculator`
> See [phase-v3-5-calculator-ui.md](./phase-v3-5-calculator-ui.md)
- [x] Build `src/components/calculator-v3/` (ProductSelectV3, SchemaDrivenForm as generic renderer, RunListV3, LayoutCanvasV3)
- [x] Build `src/pages/CalculatorV3Page.tsx` (hand-coded `FALLBACK_FIELDS` drive SchemaDrivenForm — shared fence config form)
- [x] Build `src/hooks/useBomCalculator.ts`
- [x] Extend `src/context/CalculatorContext.tsx` (payload: `SET_PAYLOAD`, `UPSERT_RUN`, `UPSERT_SEGMENT`, `REMOVE_SEGMENT`, `REMOVE_RUN`, `SET_BOM_RESULT`)
- [x] Wire `/calculator` route in `src/App.tsx`
- [x] SchemaDrivenForm emits `data-testid={field_key}` for Cypress compatibility
- [x] Scope reduction: `useProductSchema` hook deleted, `LayoutCanvasV3 actions` prop removed — form/canvas toolbar are shared across fencing systems, not per-product schema-driven
- [ ] Canvas ↔ form round-trip verified *(manual test pending — requires Supabase running)*

### V3-6 — BOM output
> See [phase-v3-6-bom-output.md](./phase-v3-6-bom-output.md)
- [x] Move `src/components/calculator/BOMResultTabs.tsx` → `src/components/shared/BOMResultTabs.tsx`
- [x] Update v2 import path (`src/pages/CalculatorPage.tsx`) to new location
- [x] Build `src/components/calculator-v3/BOMWarningsPanel.tsx` (errors red, warnings amber, assumptions grey)
- [x] Build `src/components/calculator-v3/AchievedHeightBadge.tsx` (inline per-segment)
- [x] Build `src/components/calculator-v3/BOMTracePanel.tsx` (admin-only collapsible)
- [ ] Verify all tab filters + recomputed totals work *(manual test pending — requires Supabase running)*
- [ ] Admin-vs-non-admin trace gating confirmed *(manual test pending)*

### V3-7 — Docs
> See [phase-v3-7-docs.md](./phase-v3-7-docs.md)
- [x] Write `docs/how_it_works.md` (1-page plain-English overview)
- [x] Update `CLAUDE.md` sections 1, 3, 5, 5a (new), 6, 8, 11, 14, 15, 16
- [x] Write this v3 Engine section in `docs/tasks.md`
- [x] Update "Current Phase" header
- [ ] Cross-link all phase docs + CLAUDE.md sections + how_it_works.md — verify links resolve

---

## Seed-mapping / Self-serve Seeding

**Stage 1+2 combined (shipped)** — JSON is the source of truth for ALL seed
data (fences, gates, legacy catalog, pricing, v3 engine rules). A Node
upserter writes directly to Postgres via supabase-js. One file per product
under `supabase/seeds/glass-outlet/products/`. `slat-fencing.sql` has been
disabled (renamed `.sql.disabled`); `organizations.sql` is the only
remaining SQL seed. Products table is now flat (`parent_id` unused) with a
`product_type` column ('fence' | 'gate' | 'other') and a
`compatible_with_system_types` array that lets a gate declare which fences
it pairs with. QSHS_GATE renamed to QS_GATE (shared across QSHS/VS/XPL/BAYG).
Enables reliable LLM authoring and sets up an in-app AI import feature later
(see `docs/seed-data-mapping-spec.md`).

- [x] JSON Schemas for every engine + catalog table (`supabase/seeds/schemas/*.schema.json`)
- [x] Wrapper schema `product-file.schema.json` — LLM output contract for per-variant files
- [x] Per-product file layout: 7 files under `supabase/seeds/glass-outlet/products/` (qshs, vs, xpl, bayg, qs_gate, gate_legacy, other)
- [x] Migration 022 — flatten products, add `product_type` + `compatible_with_system_types`
- [x] Rename QSHS_GATE → QS_GATE (its own file, `compatible_with_system_types: ['QSHS','VS','XPL','BAYG']`)
- [x] Migrate slat-fencing.sql content into JSON (catalog + pricing + 4 fence products + 12 inactive families); rename original to `.sql.disabled`

### v3 UI polish + v2 retirement (shipped)

- [x] Searchable fence-only product dropdown (`ProductSelectV3` rewritten as a typeahead, filters `product_type='fence'`)
- [x] Data-driven job settings — `useProductVariables` hook loads `product_variables` from Postgres; `FALLBACK_FIELDS` deleted
- [x] `SchemaDrivenForm` wraps fields at 1/3 width on desktop (responsive flex grid)
- [x] Gate management UI — `GateListV3` + `GateFormV3` modal, backed by canonical payload QS_GATE runs
- [x] Extra items panel — typeahead against existing SKUs (via `search-products`) + create-on-the-fly for one-off lines
- [x] v2 retired — `CalculatorPage`, `src/components/calculator/*`, `useCalculatorBOM`, `useFenceProducts`, `calculate-bom-v2` edge function all deleted. `/` redirects to `/calculator`.
- [ ] v1 (`/new`, `MainApp`, `calculate-bom`) removal — deferred to a future pass.
- [x] `dump-to-json.js` emits per-variant wrapped files
- [x] `seed-products.js` Node upserter — validates each file, resolves FKs by business keys, upserts all sections via supabase-js, runs post-check row-count floors
- [x] Migration 020 — unique indexes on engine tables (upsert conflict targets)
- [x] Migration 021 — RLS across all engine + catalog tables (authenticated SELECT org-scoped on engine config; deny-by-default on `product_components` + `pricing_rules`)
- [x] `npm run seed:products` wired in; `db:reset` runs it after migrations + slat-fencing.sql
- [x] Round-trip verified: upsert → dump → identical JSON; dup-SKU sanity test passes
- [x] RLS smoke test: authenticated user sees engine rows, denied on pricing/components
- [x] Portable mapping spec at `docs/seed-data-mapping-spec.md`
- [x] Claude skill at `.claude/skills/seed-mapper/` (SKILL.md + schema-catalogue + expression-syntax + worked examples for QSHS_GATE and a hypothetical VS system)
- [ ] Stage 3 — in-app AI import feature backed by the same JSON Schemas (not scheduled)

---

## Done

- **Phase 0** — Cypress test suite: all 23 test files written, TC test bugs fixed (TC3, TC4, TC11, TC12, TC14, TC17, TC24), failures documented in `docs/cypress-test-report.md`
- **Phase 1** — Foundation: Vite + React + TS scaffolded, Tailwind v3 + PostCSS configured, all 6 SQL migrations written, auth components built (LoginForm, SignUpForm, AuthGuard, useAuth), AppShell + Header built, React Router configured. *(Supabase CLI install + migration apply pending.)*
- **Phase 2** — Fence Configuration: Zod schema, FenceConfigContext (useReducer, XPL enforcement), FenceConfigForm (RHF + Zod, all data-testid attrs), ColourSelect, SlatSizeSelect, SlatGapSelect, AccordionSection, FormField, constants. Build passes with zero TypeScript errors.
- **V3 Planning** — Reviewed `qshs_mvp_build_pack/` + `qshs_gates_build_pack/`, wrote 7 phase specs (`docs/phase-v3-*.md`), one-page overview (`docs/how_it_works.md`), updated CLAUDE.md with v3 architecture, added v3 section to `docs/tasks.md`.

---

## Notes

- The existing `index.html` is the **functional specification for v1** — every form field, dropdown, and validation rule must be reproduced in the v1 React app (except the two AI features deferred)
- **Deferred features** (do NOT build): AI job description parsing, AI BOM review
- All prices and BOM logic must live in Supabase Edge Functions — never in the client bundle
- Currency: AUD, GST: 10%, measurements: metric (mm / m)
- **v3 scope is fencing-only.** QSHS fence + QSHS_GATE in MVP. Post-MVP phases add VS/XPL/BAYG via new seed rows, then QSVS/QSGH/HSSG gate families, then patios-as-fences. All fencing systems share one hand-coded form and canvas toolbar; per-product differences live in the BOM engine seed data. Non-fence products (balustrades, pool fencing that isn't slat-based, etc.) are out of scope.
