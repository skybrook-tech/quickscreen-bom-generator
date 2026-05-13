# QuickScreen BOM Generator — Task Tracker

## Current Phase

> **Phase 7 (v1 polish)** in progress — see v1 checklist below.
> **v3 Engine** — V3-1 through V3-6 complete. V3-7 (docs cross-linking) is the only remaining item.
> Start here for an overview: [`docs/how_it_works.md`](./how_it_works.md).

Latest sandbox polish: run sidebar readability, 0m first-segment defaults, compact length/height controls, and endpoint/corner gate placement are implemented on `codex/qshs-calculator-sandbox`.

Living app overview: [`docs/app-overview.md`](./app-overview.md) now tracks current routes, file responsibilities, data flow, mapper responsibilities, fallback engine behavior, Supabase seed structure, and update rules.

Latest BOM workflow pass: generated BOM rows aggregate by product within each tab, individual gate tabs are labelled from the canonical gate segments, Generate BOM clears stale results before recalculating, and the mapper opens without the initial snap dot.

Latest sidebar pass: run cards now remove the redundant master-settings line, segment cards show compact order summaries with bold values, length/height editing moved into segment options, segment cards have a blue 3D border, segment confirm/remove controls were reduced to a blue dot and two-click red X, and the layout map button now opens/minimizes the map.

Latest calculation correction: VS F-section stock in the local fallback calculator now uses two height-cut side F-sections per panel, matching the QuickScreen vertical slat catalogue assembly.

Latest gate correction: QSG horizontal and vertical pedestrian swing gates now use the QSG side frame, normal QSG 65/90 gate rails, infill/channel infill, screw cover, joiner blocks, spacers, rail screws, wafer screws, and 50x50 top caps in the local fallback BOM. HD rails remain reserved for sliding-gate logic.

Latest workflow/UI correction: form-entered dimensions now center in the mapper when loaded, and gate hardware choices are dropdown selectors with inventory search inside each selector.

Latest segment clarity pass: segment and gate cards now show full beginner-friendly titles (`Run 1 Segment 1`, `Run 1 Gate 1`) alongside compact map codes (`R1S1`, `R1G1`) in bold black, the master-match check and confirmed dot sit in the left rail, max post spacing defaults to 2600mm with an editable 100-3000mm draft input, vertical slat runs can use custom gaps, and standard post labels now put the dimensions first.

Latest Codex PR brief pass: Tier 6 Brief AF is complete. The BOM now has a cut-list view, catalogue page chips, carton-proximity hints, and install-video QR cards in both run headers and BOM sections.

Latest double-gate correction: double swing gates now normalize legacy `double-swing` / `double` values to `double_swing`, calculate two equal gate leaves inside one opening, subtract hinge clearance on both leaves plus one shared latch gap, and multiply QSG gate frame/slat/rail/hinge materials by two leaves in the local fallback BOM.

Latest opening-screen workflow pass: typing in the intro job-name box no longer opens the workspace by itself; the Open workspace button now opens the workspace and carries the typed job name through to the quote UI. Intro copy was simplified, and Run Settings now has a bottom save/collapse button.

Latest agent-skill portability pass: the specialist calculator skills are now stored in the repo under `.agents/skills/` with an index README, so future developers and AI agents can access the same project-manager, UI, QA, catalogue-extraction, QuickScreen BOM, and seed-mapping guidance.

Latest skill-location fix: the same specialist skill set is now mirrored under `.claude/skills/`, and `.gitignore` now allows all `.claude/skills/**` and `.agents/skills/**` files so new project skills are pushed instead of staying local-only.

Latest Brief I pass: the `/calculator` BOM hero now uses an editorial summary layout with the scoped total as the main typographic element, BOM rows show the active quantity-break tier, and rows close to the next seeded quantity break show how many more units are needed for the next tier.

Latest Brief J pass: fence segment settings now use progressive disclosure. Geometry stays immediately visible, deeper Style/Posts/Advanced settings sit behind a persisted "Show more settings" control, keeping the initial segment editor compact.

Latest Brief K pass: selected controls on the `/calculator` sandbox now use a clearer brand-primary selected state, checkmarks, `aria-pressed`, 8px button radius, and stronger hover affordances for product, system, and option controls.

Latest Brief L pass: the calculator now has keyboard shortcut help (`?`), shortcuts for Generate BOM and CSV export, title tooltips on shortcut-enabled actions, BOM loading skeletons, a clearer empty state, and animated grand-total updates.

Latest Brief M pass: suggested accessories now support add/remove toggling, persistent hide/restore preferences with undo toast, and pinned catalogue suggestions via SKU/description search.

Latest Brief N pass: the app header now prioritises The Glass Outlet, the desktop run/BOM divider width persists locally, and mobile users get bottom Run/BOM/Map tabs so the BOM and layout map remain reachable on phones.

Latest Brief O pass: the layout canvas now renders against a device-pixel-ratio-aware backing store for sharper lines on laptops/retina screens, and gate placement/dragging can snap to 100mm increments from the existing canvas toolbar.

Latest Brief P pass: the map underlay now uses the Google Maps key path for Static Maps and Places autocomplete, auto-calibrates canvas scale from latitude/zoom when an address loads, shows calibration feedback, and keeps a satellite empty-state hint visible until an address is selected.

Latest Brief Q pass: canvas-to-canonical payloads now retain per-gate position, gate anchor, and source canvas segment metadata so multi-run layouts and gate markers survive save/load round-trips; applying a drawn layout now asks before replacing existing configured runs.

Latest Brief R pass: the canvas toolbar now includes Redo with Ctrl+Y/Ctrl+Shift+Z support, undone actions can be restored from full canvas snapshots, and placed gates now render differently for single swing, double swing, and sliding directions based on the gate editor settings.

Latest Brief S pass: the layout mapper now has a top-level Help button with a four-section cheat sheet, first-use Boundary mode guidance, hidden corner instruction clutter, a clarified px/m scale control, and token-aligned primary mapper actions.

Latest installer-map workflow pass: user-facing segment copy is now section copy in the active V3 workspace, run settings are directly editable at the run level, section codes show green when matching run settings, typed section length edits take priority when redrawing the map, gate placement asks for width/type before dropping with a width preview, and the canvas toolbar can print an installer-ready map.

Latest Brief T pass: swing gates now show a live estimated gate weight, rank catalogue hinges by fit/tight/fail against the required rating, guide latch selection with white-finish handling, expose the four active drop-bolt SKUs, offer known hinge/latch kits, and emit selected hardware/TruClose caps through the local fallback BOM.

Latest Brief U pass: QSHS/XPL height choices now derive live from the catalogue formula `((slat + gap) x N) - gap + 3`, store the selected slat count, rebuild when slat size/gap changes, show derivation chips, and keep VS as a custom free-height input.

Latest Brief V pass: QSG gate infill selection now keeps horizontal gates on `QSG-4800-INF` cut to gate width and vertical gates on `QSG-4200-CINF` cut to gate height, including the sliding-gate fallback path.

Latest Brief W pass: gate openings now validate against catalogue width maximums by gate type/orientation, show warning/error chips with alternative suggestions, offer a switch-to-alternative action, and block Generate BOM only for hard gate-width errors.

Latest Brief X pass: sliding gates now expose track, top guide, and catch choices, emit the selected guide/catch/track SKUs, auto-add centre support rail/cap/plates for sliding gates over 3000mm, and suggest the same CSR kit for shorter sliding gates.

Latest Brief Y pass: sliding gates now have an optional Filo 400 automation flow with mains/solar power, long-run split-pack switching, battery/keypad/extra remote options, rack count preview, automation subtotal, and BOM lines grouped under automation.

Latest Brief Z pass: fence section settings now include left/right end-condition chips for Post, Wall, Pillar, and Void; non-post ends flow through the existing wall/F-section BOM path while adjacent shared ends render read-only.

Latest sidebar and mapper usability pass: run settings now collapse independently with auto-collapse after idle hover, run fields render as compact selected-value accordions, section cards have a stronger centered title and map-code bubble, section settings use compact collapsible groups without a separate advanced button, gate dimensions edit as millimetre widths, and the mapper text tool now supports dragging a note box before typing.

Latest BAY-G and launch workflow pass: BAY-G is restored to the active system selector as an infill-screen workflow, BAY-G runs use width/height/quantity panel groups with no gate/post controls and no post BOM lines, the calculator now opens on a branded Glass Outlet start screen, the layout-map CTA uses a drawing-oriented treatment, gate settings are grouped into collapsible sections, and the mapper toolbar now groups drawing/site/action/view tools with existing-post and pillar markers.

Latest run-default and gate-behaviour pass: Run Settings now actively reset section and gate defaults for the whole run, matching section codes stay green and can be clicked to revert an overridden section, number fields allow clearing before retyping, double swing gates calculate as two leaves with hinge/latch clearance and default drop bolt handling, failed hinge/latch options move under override sections, and sliding gates carry slide-side data through the sidebar, canvas, canonical payload, and local fallback BOM.

Latest mobile mapper audit pass: the `/calculator` mobile workflow now opens the layout map from the intro with a fallback QSHS payload, uses the bottom Run/BOM/Map tabs as true mobile panes, keeps Run/BOM reachable by minimizing the map when those tabs are selected, gives the mapper touch start/move/end support for phone drawing and gate dragging, switches the mapper toolbar to horizontal scrolling on narrow screens, hides the satellite hint over the phone canvas, and adds mobile footer clearance so action buttons are not covered by the bottom nav.

Latest Brief AU pass: BOM rows now retain source breakdowns for run/gate scoped review, the All BOM tab aggregates to one line per SKU while filtered tabs re-price by scoped quantity, BOM display categories now use a richer category/subcategory/sort order taxonomy, seed components carry display metadata without changing engine selector categories, and TruClose safety caps (`TC-CAPS3`) are offered as an optional add-on instead of being auto-added.

Latest print BOM pass: the print/PDF BOM now hides screen-only pricing hints, tier badges, derivation notes, next-tier/carton prompts, source chips, edit controls, accessory/search panels, and QR cards; print CSS resets scroll-container heights so long BOMs can paginate beyond page one; optional map inclusion prints the layout map as a normal bottom section after the BOM.

Latest pricing data pass: Brief AM is in progress. A repeatable `npm run prices:import` task now ingests the local Glass Outlet CSV price exports, updates seed pricing rows with per-SKU `qty >= minQty` quantity-break rules, creates a catalogue-only seed for additional priced supplier SKUs, refreshes local break hints, removes default-price fallback from the local BOM calculator, and adds BOM UI chips for verified prices and unpriced lines.

Latest Brief AT pass: supplier-portal pricing captured on 2026-05-09 now has a repeatable `npm run prices:brief-at` staging flow, `pricing-2026-05-09.json`, and an idempotent pricing migration. Verified BB bulk-buy pairs are mapped in code, the BOM can show BB saving hints, Diamond Revolution kit suggestions compute their total from live SKU prices, and pricing anomalies/WHITE latch parity notes are documented in `docs/brief-at-pricing-notes.md`.

Latest Brief AY pass: the landing screen is simplified to a single job-details entry, the empty workspace sidebar now offers three equal numbered choices (Draw, Describe, Select), the map entry copy is standardised as `Draw your fence`, run/BOM summaries surface post-BOM panel counts with an em-dash placeholder before generation, and first-section settings auto-open with a one-time run-defaults teaching card.

Latest Brief BB pass: gate diagrams now use clearer single/double swing arcs and sliding direction indicators, Describe Your Fence previews no longer block on missing values and instead highlight sensible defaults, the sidebar map toggle is sticky and always reachable, install videos moved to the top-right header icon, landing Enter/Tab/blur commits a non-empty job name and opens the workspace, the default canvas height is now 630px, and endpoint dragging pivots around the opposite end with BA's whole-section/Alt-drag mode removed.

Latest Brief BD pass: gate settings now include numbered QSG component diagrams for horizontal and vertical gates, BOM rows show matching numbered badges with hover cross-highlighting, QS gate seed component metadata mirrors the same diagram references, and double-swing gate openings now carry editable finished leaf widths so the local BOM, canvas arcs, and gate summaries treat a double gate as two leaves in one opening.

Latest Brief BD follow-up: BOM rows no longer expose per-line Tier 1/2/3 labels, quantity-break hints remain user-facing as lower-unit-price prompts, and QSG swing-gate hinge quantities are harmonised to exactly 2 hinges per leaf in both local fallback emission and QS_GATE seed companion metadata.

Latest Brief BE sandbox consolidation: gate width validation now treats single swing as max 2100mm and double swing as two leaves up to a 4200mm opening, switching single to double doubles the opening before splitting leaves, switching double to single combines the leaves back into one opening, all active seed/UI defaults now start on 9mm gaps and 1800mm height, the map default canvas height increased by 25%, the Glass Outlet header no longer shows the SkyBrookAI powered subtitle, run cards remove flat panel/gate count clutter, and the BOM header uses full system/gate wording.

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
- [x] Retired old XP gate-frame hardware from active gate paths: `gate_legacy.json` is disabled, QS_GATE seed rows/selectors/rules for `XP-6100-GB65-*`, `XP-4200-GSTOP-*`, `XP-LBOX-*`, and `XP-HDL-*` are inactive, and the local fallback blocks those discontinued SKUs from BOM output.
- [x] Added a wider current-catalogue gate hardware menu for QSG gates, including D&D TruClose/Kwik Fit/SureClose hinges, Six Star/Zeus/Colourbond hinge options, Lokk Latch/Magna Latch/T-Latch latch options, white hardware variants, drop bolts, and gate stops.
- [x] Sliding gate local fallback corrected to output QSG sliding gate rails, side frames, infill/channel infill, screw covers, joiners, spacers, top caps, wheel/clamp hardware, track, and horizontal centre support rails/plates.
- [x] QSG gate pricing pass: verified missing active gate SKUs through Glass Outlet online lookup, added pricing for side frames, infills, screw covers, top caps, joiners, rail screws, screws, and spacers, and retired legacy placeholder QSG-SC/QSG-RS/QSG-FTC rows.
- [x] Run/segment sidebar cleanup: run headings now show total posts, matching segment cards only show length/height, changed segment cards only show differing settings, and segment options open by double-clicking the card.
- [x] Tier 1 Brief A foundation pass started: hardcoded primary/success/warning/danger colour utility classes replaced with brand tokens, Inter added as the app font, action buttons moved toward the 8px radius standard, and icon sizes normalized to 16/20px with the layout-map CTA kept at 22px.
- [x] Tier 6 Brief AA: Economy 65mm slats now aggregate required stock lengths by run, order `XP-6500-E65-*` as packs of 96, show the pack note/waste prompt, block invalid 90mm economy combinations, and provide a BOM switch action to convert affected run sections to Standard slats.
- [x] Tier 6 Brief AB: Canvas-derived corners now classify as 90 degree, 135 degree, or custom, section settings expose editable corner overrides, 135 degree corners emit the adapter plus screw pack, and custom angles produce a supplier-verification BOM warning line.
- [x] Tier 6 Brief AC: Run settings now include post-fixing material and base-plate substrate choices, local BOM emits selected concrete/grout and substrate fixing kits, chemical anchor suggestions appear for concrete base plates, and grout choice persists locally for future runs.
- [x] Tier 6 Brief AD: QSHS 65mm sections can enable louvre treatment, the local BOM emits `QS-LB-*` bracket packs per slat/panel, slat fixing screws are reduced for louvre sections, and QS-LB pricing/quantity breaks are loaded from the CSV.
- [x] Tier 6 Brief AE: Suggested accessories now include gate handles, driver bits, post plugs, core-drill dress-ring/tooling/epoxy prompts, base-plate threadlocker prompts, general silicone, and gate-colour touch-up paint suggestions with local CSV-backed pricing for the new SKUs.
- [x] Tier 6 Brief AF: BOM polish added a line-items/cut-list toggle, Pack 1/2/3 delivery grouping, catalogue page chips, carton threshold hints, and install-video QR cards for QSHS, VS, pedestrian gates, and sliding gates.
- [x] Layout/sidebar polish pass: layout-map controls moved left, map overlay now respects the live sidebar width, active-job draw-map CTA moved into the BOM action area with a 3D globe treatment, section controls now show Section/Gate settings labels, current settings show Panel width instead of Max Post Spacing, post spacing is collapsed at the bottom of section settings, louvre treatment moved to run settings, and gate settings were split into per-setting dropdown sections.
- [x] Glass Outlet branding pass: opening screen and BOM header now use a dark-blue Glass Outlet logo/wordmark treatment.
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
- [x] Brief AT supplier portal price staging: generated `supabase/seeds/glass-outlet/pricing-2026-05-09.json`, added `npm run prices:brief-at`, refreshed local catalogue pricing rows, and documented excluded anomaly SKUs for supplier review.
- [x] Brief AV Describe Your Fence v1: added deterministic no-AI natural-language parsing, landing/sidebar describe-entry UI, confidence preview chips with inline edits, Web Speech API dictation fallback, parsed-gate position badges/modal, job description metadata persistence, CSV/print summary inclusion, and a TC-01 through TC-12 parser corpus runner.
- [x] Brief BA sidebar polish/map/BOM cleanup: job names now commit into bold inline text, the three-entry cards match the darker prototype style, sections default to 0m and nest visually under runs, Clear Map/Clear Job/Remove Run use one shared two-click confirm pattern, the map summary lists sections under runs, and BOM print hides top price/UI chrome. Brief BB later replaced BA's Move/Edit drag behavior with pivot-around-opposite-end endpoint editing.
- [x] Brief BC unified calculator experience: landing now goes straight to the calculator with a sidebar Describe Your Fence component instead of AY's three entry cards, Map/BOM tabs host the right pane, typed/canvas length edits continue to sync through the canonical payload, gate openings remain section-owned but render in a run-bottom Gates group, expanded map mode covers the whole viewport including the sidebar, map shortcuts/help were surfaced, and run details render below the docked map while preserving the flat BOM-compatible `gate_opening` segments.
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

