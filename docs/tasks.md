# QuickScreen BOM Generator — Task Tracker

## Current Phase

> **Phase 6 — Canvas Layout Tool** (next up)

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
| 6 | Canvas Layout Tool | ⬜ Not started |
| 7 | Polish | ⬜ Not started |

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

- [ ] Extract canvas drawing code from existing `index.html`
- [ ] Port into `src/components/canvas/canvasEngine.ts` (pure TS, no React)
- [ ] Implement `initCanvasEngine()` with full public API (`destroy`, `getLayout`, `setTool`, `undo`, `clear`, etc.)
- [ ] Port grid snap logic
- [ ] Port pan & zoom (scroll = zoom, right-drag = pan)
- [ ] Port undo stack
- [ ] Port segment label editing (click label to edit real-world length)
- [ ] Port gate marker placement on segments
- [ ] Port Google Maps tile underlay logic
- [ ] Build `FenceLayoutCanvas.tsx` React wrapper (`useRef` + `useEffect`)
- [ ] Build `CanvasToolbar.tsx` (Draw, Gate, Move, Undo, Clear buttons)
- [ ] Build `MapControls.tsx` (address search, opacity slider, map type)
- [ ] Wire "Use This Layout →" → dispatch to `FenceConfigContext` and `GateContext`
- [ ] Verify canvas event listeners are cleaned up on unmount
- [ ] Hide canvas section on mobile breakpoint

---

## Phase 7 — Polish

> See [phase-7-polish.md](./phase-7-polish.md)

- [ ] Audit all components for dark theme consistency (no light-mode leaks)
- [ ] Add loading spinners/skeletons to all async operations
- [ ] Add React Error Boundaries to BOM display and canvas sections
- [ ] Add toast notifications (quote save, clipboard copy, CSV download, auth errors, edge function errors)
- [ ] Responsive audit: mobile form-only mode, tablet canvas, desktop full layout
- [ ] Verify canvas has no memory leaks (mount/unmount in dev tools)
- [ ] Verify BOM re-pricing (tier switch) does not re-trigger edge function
- [ ] Check for unnecessary React re-renders caused by canvas updates
- [ ] Run full Cypress suite (all 23 test cases) on production build
- [ ] Complete security checklist (see phase-7 doc)
- [ ] Move GitHub repo to private

---

## Done

- **Phase 0** — Cypress test suite: all 23 test files written, TC test bugs fixed (TC3, TC4, TC11, TC12, TC14, TC17, TC24), failures documented in `docs/cypress-test-report.md`
- **Phase 1** — Foundation: Vite + React + TS scaffolded, Tailwind v3 + PostCSS configured, all 6 SQL migrations written, auth components built (LoginForm, SignUpForm, AuthGuard, useAuth), AppShell + Header built, React Router configured. *(Supabase CLI install + migration apply pending.)*
- **Phase 2** — Fence Configuration: Zod schema, FenceConfigContext (useReducer, XPL enforcement), FenceConfigForm (RHF + Zod, all data-testid attrs), ColourSelect, SlatSizeSelect, SlatGapSelect, AccordionSection, FormField, constants. Build passes with zero TypeScript errors.

---

## Notes

- The existing `index.html` is the **functional specification** — every form field, dropdown, and validation rule must be reproduced in the React app (except the two AI features deferred to v2)
- **v2 deferred features** (do NOT build): AI job description parsing, AI BOM review
- All prices and BOM logic must live in Supabase Edge Functions — never in the client bundle
- Currency: AUD, GST: 10%, measurements: metric (mm / m)
