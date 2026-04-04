# QuickScreen BOM Generator — Task Tracker

## Current Phase

> **Phase 0 — Cypress Test Suite** (in progress — awaiting npm install)

---

## Phases Overview

| Phase | Title | Status |
|-------|-------|--------|
| 0 | Cypress Test Suite | ⬜ Not started |
| 1 | Foundation | ⬜ Not started |
| 2 | Fence Configuration | ⬜ Not started |
| 3 | Gate Configuration | ⬜ Not started |
| 4 | BOM Engine (Edge Functions) | ⬜ Not started |
| 5 | Quotes & Export | ⬜ Not started |
| 6 | Canvas Layout Tool | ⬜ Not started |
| 7 | Polish | ⬜ Not started |

---

## Phase 0 — Cypress Test Suite

> See [phase-0-cypress-tests.md](./phase-0-cypress-tests.md)

- [ ] Install Cypress and TypeScript support *(awaiting npm — run `npm install` once Node is available)*
- [x] Create `cypress/support/selectors.ts` (data-testid abstraction layer)
- [x] Create `cypress/support/helpers.ts` (`fillFenceConfig`, `addGate`, `generateBom`, `assertBomLine`, `assertGrandTotal`, etc.)
- [x] Create pricing fixture files (`tier1.json`, `tier2.json`, `tier3.json`)
- [x] Create test files TC1–TC10 (BOM line items & accessory quantities)
- [x] Create test files TC11–TC19 (pricing tiers, colour switching, system type, post count)
- [x] Create test files TC24–TC26 (edge cases)
- [x] Add `data-testid` attributes to existing HTML app (non-destructive)
- [ ] Run suite against existing HTML app — TC1 and TC5 must pass
- [ ] Document all other failures (test bug vs app bug)

---

## Phase 1 — Foundation

> See [phase-1-foundation.md](./phase-1-foundation.md)

- [ ] Scaffold Vite + React + TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install all dependencies (Supabase, TanStack Query, React Hook Form, Zod, React Router, Lucide, etc.)
- [ ] `supabase init` + `supabase start` (local dev stack)
- [ ] Write migration `001_create_organisations.sql` + seed Glass Outlet org
- [ ] Write migration `002_create_profiles.sql` (profiles table, `auth.user_org_id()` helper, signup trigger)
- [ ] Write migration `003_create_quotes.sql` (quotes table + RLS policies)
- [ ] Write migration `004_create_pricing.sql` (product pricing, no RLS)
- [ ] Write migration `005_create_products.sql` (top-level products — fence systems and gate products, no RLS)
- [ ] Write migration `006_create_product_components.sql` (component catalog — individual SKUs/hardware, no RLS)
- [ ] Apply all migrations
- [ ] Set up `src/lib/supabase.ts` and `src/lib/queryClient.ts`
- [ ] Configure Tailwind theme (brand colours)
- [ ] Build `AppShell.tsx`, `Header.tsx`, `Footer.tsx`
- [ ] Set up React Router with routes: `/login`, `/signup`, `/`, `/quotes/:id`
- [ ] Build `LoginForm.tsx` and `SignUpForm.tsx`
- [ ] Build `AuthGuard.tsx` (redirect unauthenticated users)
- [ ] Implement `useAuth.ts` hook
- [ ] Verify login → main app and logout → login page redirect

---

## Phase 2 — Fence Configuration

> See [phase-2-fence-configuration.md](./phase-2-fence-configuration.md)

- [ ] Write `src/schemas/fence.schema.ts` (Zod)
- [ ] Write `src/types/fence.types.ts`
- [ ] Build `FenceConfigContext.tsx` with reducer and business rule enforcement
- [ ] Build `FenceConfigForm.tsx` (React Hook Form + Zod)
- [ ] Build `SystemTypeSelect.tsx`
- [ ] Build `ColourSelect.tsx` (with limited-availability flag)
- [ ] Build `SlatSizeSelect.tsx`
- [ ] Build `SlatGapSelect.tsx`
- [ ] Build `PostMountingSelect.tsx`
- [ ] Build `TerminationSelect.tsx` (left + right)
- [ ] Build `CornerInput.tsx`
- [ ] Build `AccordionSection.tsx`, `FormField.tsx`, `Select.tsx`, `Button.tsx` shared components
- [ ] Enforce XPL → 65mm slat rule in reducer
- [ ] Verify form validates with Zod before submission

---

## Phase 3 — Gate Configuration

> See [phase-3-gate-configuration.md](./phase-3-gate-configuration.md)

- [ ] Write `src/schemas/gate.schema.ts` (Zod)
- [ ] Write `src/types/gate.types.ts`
- [ ] Build `GateContext.tsx` with reducer
- [ ] Build `GateTypeSelect.tsx`
- [ ] Build `GateForm.tsx` (individual gate)
- [ ] Build `GateList.tsx` (summary of all configured gates)
- [ ] Build `GateConfigPanel.tsx` (section wrapper)
- [ ] Implement "Match Gate to Fence" toggle (show/hide overridable fields)
- [ ] Implement add gate flow
- [ ] Implement edit gate flow
- [ ] Implement remove gate flow
- [ ] Add warnings for post sizes that require stock confirmation

---

## Phase 4 — BOM Engine (Edge Functions)

> See [phase-4-bom-engine.md](./phase-4-bom-engine.md)

- [ ] Create `supabase/functions/_shared/cors.ts`
- [ ] Create `supabase/functions/_shared/auth.ts`
- [ ] Create `supabase/functions/_shared/types.ts`
- [ ] Copy Zod schemas to `supabase/functions/_shared/` for Deno
- [ ] Implement `calculate-bom` edge function — panel layout algorithm
- [ ] Implement `calculate-bom` edge function — post count logic
- [ ] Implement `calculate-bom` edge function — slat calculation
- [ ] Implement `calculate-bom` edge function — rail calculation
- [ ] Implement `calculate-bom` edge function — bracket/fixing calculation
- [ ] Implement `calculate-bom` edge function — system-specific rules (QSHS, VS, XPL, BAYG)
- [ ] Implement `calculate-bom` edge function — gate BOM
- [ ] Implement `calculate-pricing` edge function
- [ ] Seed `product_pricing` table
- [ ] Seed `products` table (fence systems / gate products)
- [ ] Seed `product_components` table (individual hardware SKUs)
- [ ] Build `useBOM.ts` hook (TanStack Query mutation)
- [ ] Build `src/types/bom.types.ts`
- [ ] Build `BOMDisplay.tsx`
- [ ] Build `BOMLineItem.tsx`
- [ ] Build `BOMSummary.tsx` (totals, GST, tier selector)
- [ ] Build `ExtraItemsAdder.tsx`
- [ ] Build `PricingTierSelect.tsx`
- [ ] Verify TC1 and TC5 pass against the new React app

---

## Phase 5 — Quotes & Export

> See [phase-5-quotes-and-export.md](./phase-5-quotes-and-export.md)

- [ ] Write `src/schemas/quote.schema.ts` and `src/schemas/contact.schema.ts`
- [ ] Write `src/types/quote.types.ts`
- [ ] Build `useQuotes.ts` hook (TanStack Query — list, save, load, delete)
- [ ] Build `SavedQuotesList.tsx`
- [ ] Build `QuoteActions.tsx` (Print, CSV, Copy, Save buttons)
- [ ] Build `QuotePDFTemplate.tsx` (@react-pdf/renderer)
- [ ] Build `ContactDeliveryForm.tsx`
- [ ] Build `JobSummary.tsx`
- [ ] Implement CSV export (Papaparse)
- [ ] Implement PDF download
- [ ] Implement clipboard copy (tab-separated for Excel)
- [ ] Build print stylesheet (`@media print`)
- [ ] Build `QuoteViewPage.tsx`
- [ ] Verify quote save → reload correctly repopulates all form state

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

_Nothing completed yet — project is pre-development (existing HTML app stage)._

---

## Notes

- The existing `index.html` is the **functional specification** — every form field, dropdown, and validation rule must be reproduced in the React app (except the two AI features deferred to v2)
- **v2 deferred features** (do NOT build): AI job description parsing, AI BOM review
- All prices and BOM logic must live in Supabase Edge Functions — never in the client bundle
- Currency: AUD, GST: 10%, measurements: metric (mm / m)
