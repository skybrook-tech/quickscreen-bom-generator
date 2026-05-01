# QuickScreen BOM Generator - Living App Overview

Last updated: 2026-05-01

This file is the regular handoff overview for the app. Update it whenever a feature changes the app flow, calculator engine, seed model, canvas mapper, Supabase schema, or key file responsibilities.

## What The App Does

QuickScreen BOM Generator is a React and Supabase quoting tool for The Glass Outlet slat screening and gate systems. The current sandbox focus is a working trade quote calculator that can:

- Select a fence system such as QSHS, VS, XPL, or BAYG.
- Configure runs, segments, gates, colours, slat sizes, gaps, post sizes, mounting type, and accessories.
- Draw or edit a fence layout on a canvas and translate that layout into run and segment data.
- Generate a priced bill of materials with GST and grand total.
- Add suggested accessories and manual extra BOM items.
- Save jobs to Supabase when Supabase is configured and the user is logged in.
- Fall back to bundled seed-backed local calculation when Supabase is unavailable or the user is not logged in.

## Current Routes

The current branch uses these active routes in `src/App.tsx`:

- `/` redirects to `/calculator`.
- `/calculator` renders the active v3 calculator surface, `CalculatorV3Page`.
- `/login` renders the auth page.
- `/quotes` and `/quote/:id` are protected saved quote views.
- `/new` still renders the older `MainApp` behind `AuthGuard`; do not extend it unless the project intentionally revives that surface.

Older docs may mention `/fence-calculator`; in this branch the locally tested route is `/calculator`.

## Runtime Stack

- `React 19` and `Vite` provide the SPA.
- `Tailwind CSS` provides styling and theme tokens.
- `React Router` controls navigation.
- `TanStack Query` handles remote and async state.
- `Supabase` provides auth, database, edge functions, and quote storage.
- `@react-pdf/renderer` and `papaparse` support exports.
- `lucide-react` provides UI icons.
- The canvas mapper is vanilla TypeScript wrapped by React, not a React canvas rewrite.

## Main Data Flow

1. `ProductSelectV3` chooses the fence product and creates the first canonical payload.
2. `CalculatorContext` stores the canonical payload and the latest BOM result.
3. `RunListV3`, `RunCard`, and `SegmentRow` edit runs, segments, and gate-opening segments.
4. `LayoutCanvasV3` and `FenceLayoutCanvas` allow drawing and editing map geometry.
5. `canonicalAdapter.ts` converts canvas layouts into the canonical payload shape and back again.
6. `useBomCalculator` sends the payload to the Supabase `bom-calculator` edge function when possible.
7. If Supabase or auth is unavailable, `useBomCalculator` uses `calculateLocalBom`.
8. `BOMResultTabs` renders per-run, gate, and all-item BOM views.
9. `CalculatorV3Page` handles job-level actions: generate BOM, clear BOM, print/export, save job, and layout/map drawer state.

## Canonical Payload

The canonical payload is the shared contract between the UI, mapper, BOM engine, and quote persistence. The main types live in:

- `src/types/canonical.types.ts`
- `src/schemas/canonical.schema.ts`
- `supabase/functions/_shared/canonical.types.ts`

Key shape:

- `CanonicalPayload` has `productCode`, `schemaVersion`, job `variables`, and `runs`.
- `CanonicalRun` has `runId`, `productCode`, run `variables`, `segments`, `corners`, and optional geometry.
- `CanonicalSegment` can be a fence `panel`, `gate_opening`, or other supported segment kind.
- Stable IDs matter. Do not regenerate `runId` or `segmentId` during canvas/form sync unless creating a genuinely new run or segment.

## Current Calculator UI Files

### Page Shell

- `src/pages/CalculatorV3Page.tsx`
  - Owns the active calculator page layout.
  - Manages job name, sidebar width, mobile layout, map drawer state, generated BOM state, edited line quantities, extra items, save job, print, and CSV export.
  - Calls `useBomCalculator`.
  - Saves jobs to `quotes` plus `quote_runs` and `quote_run_segments` when Supabase is configured and a user is logged in.

### Product And Run Setup

- `src/components/calculator-v3/ProductSelectV3.tsx`
  - Loads active fence products from Supabase `products`.
  - Falls back to `localFenceProducts`.
  - Starts a new payload with one run and one first segment.
  - Current first segment default length is `0m`, so the user enters the real measured length.

- `src/components/calculator-v3/RunListV3.tsx`
  - Renders all runs.
  - Adds new runs and copies the prior/master defaults where required.
  - Newly added run first segments also start at `0m`.

- `src/components/calculator-v3/RunCard.tsx`
  - Renders each run heading, master settings summary, segment list, gate list, and run-level actions.
  - The first fence segment in a run acts as the master/default for following segments and gates.
  - Master setting summary pills render labels strongly and values in muted grey for readability.

- `src/components/calculator-v3/SegmentRow.tsx`
  - Renders the compact row for a panel or gate-opening segment.
  - Handles length/height editing, segment confirmation, reset-to-master, removal, and expand/collapse.
  - For gates, checks whether the gate matches the run master height and horizontal/vertical build type.
  - Closed fence segment rows show the order summary: segment length, height, system, colour, slat, gap, post type, mounting, post spacing, corner/end/total posts. Length and height edit controls live in the expanded options area. Remove uses a two-click red X confirmation.

### Segment And Gate Details

- `src/components/calculator-v3/FenceSegmentDetails.tsx`
  - Expanded fence segment controls.
  - Covers colour, post colour, slat size, gap, post size/system, mounting method, max post spacing, and related segment options.

- `src/components/calculator-v3/GateSegmentDetails.tsx`
  - Expanded gate-opening controls.
  - Covers gate build, movement, hardware, gate post size, colour, slat size, gap, and termination-post behavior.

- `src/components/calculator-v3/GateListV3.tsx` and `GateFormV3.tsx`
  - Older/auxiliary v3 gate list/form components. Prefer checking actual usage before extending them because gate workflow has moved heavily into segment rows.

### BOM Panels

- `src/components/shared/BOMResultTabs.tsx`
  - Displays BOM tabs, scoped totals, editable line quantities, and removable line items.
  - Tabs include all items, each run, all gates, and individual labelled gate tabs when gate segment data is available.
  - Rows are expected to be aggregated by matching SKU/category/description/unit before display so repeated segment-level quantities read as one order line.

- `src/components/calculator-v3/ExtraItemsPanel.tsx`
  - Lets the user add product search/manual extras to the generated BOM.

- `src/components/calculator-v3/SuggestedAccessoriesPanel.tsx`
  - Shows suggested accessories derived from the current payload and BOM.

- `src/components/calculator-v3/BOMWarningsPanel.tsx`
  - Displays warnings/errors/assumptions from the BOM engine.

- `src/components/calculator-v3/BOMTracePanel.tsx`
  - Admin/debug trace display for engine output when available.

- `src/components/calculator-v3/AchievedHeightBadge.tsx`
  - Shows calculated achieved height where engine output provides it.

## Canvas And Layout Mapper

The mapper is intentionally split between a vanilla engine and a React wrapper.

- `src/components/canvas/canvasEngine.ts`
  - Owns drawing, tools, pan/zoom, grid, segment length edits, node dragging, gate placement, gate dragging, post previews, map drawing, labels, undo, and layout export/import.
  - Does not import React.
  - Recent behavior: gate markers can now anchor at `start`, `center`, or `end`, so a gate can sit flush at a segment end or corner while keeping the full opening width.

- `src/components/canvas/FenceLayoutCanvas.tsx`
  - React wrapper around the engine.
  - Wires toolbar buttons, map controls, gate edit callbacks, and layout sync.

- `src/components/calculator-v3/LayoutCanvasV3.tsx`
  - Bridges the calculator payload and `FenceLayoutCanvas`.
  - Uses canonical adapters for canvas-to-payload and payload-to-canvas sync.

- `src/components/canvas/canonicalAdapter.ts`
  - Converts `CanvasLayout` into `CanonicalPayload` runs/segments.
  - Converts canonical payloads back to canvas layouts for reload/edit.
  - Splits a drawn segment into panel/gate/panel canonical pieces when a gate is placed.
  - Preserves geometry angle hints so angled layouts do not flatten during sidebar edits.
  - Skips zero-length initial panel segments when rebuilding the visual canvas so a new job starts with a clear map.

- `src/components/canvas/CanvasToolbar.tsx`, `MapControls.tsx`, `LayoutMinimap.tsx`
  - Supporting UI for drawing tools, Google Maps/satellite underlay settings, and map overview.

## Calculator And Pricing Logic

### Primary Backend Engine

- `supabase/functions/bom-calculator/index.ts`
  - Main v3 BOM edge function.
  - Validates canonical payloads.
  - Loads products, current rule versions, variables, rules, selectors, companions, validations, warnings, and pricing.
  - Evaluates rule expressions and returns lines, run results, gate items, totals, warnings, errors, assumptions, computed values, and optional trace.
  - Should stay product-agnostic. Product-specific rules belong in seed JSON.

### Pricing Edge Function

- `supabase/functions/calculate-pricing/index.ts`
  - Legacy/support pricing function.
  - Reads pricing rules and applies quantity break pricing.

### Product Search Edge Function

- `supabase/functions/search-products/index.ts`
  - Searches product components/SKUs for extras and lookup support.

### Local Fallback Engine

- `src/hooks/useBomCalculator.ts`
  - Calls Supabase `bom-calculator` when configured and authenticated.
  - Falls back to `calculateLocalBom` when Supabase is missing, no session exists, or the edge call fails.

- `src/lib/localBomCalculator.ts`
  - Frontend fallback BOM calculator.
  - Supports the current sandbox systems and enough logic to keep the calculator testable locally.
  - Uses local seed data and local price breaks.
  - VS vertical slat fallback rule: slats and F sections are cut to fence height; each panel gets two height-cut side F sections, while the U-channel and QuickScreen frame inserts are cut to panel length.
  - QSG pedestrian swing gate fallback rule: horizontal and vertical pedestrian gates use `QSG-4200-GSF50-*` side frames, `QSG-4800-RAIL65/90-*` gate rails, gate/channel infill, screw cover, joiner blocks, spacers, `AR-SCR-BR-50PK`, `QS-SCREWS-50PK`, and `QSG-GFC-50X50-*`. `XP-6100-HD6545-*` is kept for sliding gates.
  - This is not the long-term IP-protected source of truth; proven rules should move into backend seed data.

- `src/lib/localSeedData.ts`
  - Bundled local products, components, and pricing rules used by the fallback calculator and UI fallbacks.

- `src/lib/localPriceBreaks.ts`
  - Quantity-break tier logic for local fallback pricing.

## Product Rules And UI Option Helpers

- `src/lib/productOptionRules.ts`
  - System-specific UI option rules and defaults.
  - Includes initial variables, available heights, slat/gap options, post defaults, max panel width defaults, and normalization.

- `src/lib/gateOptionRules.ts`
  - Gate-specific defaults and allowed options.
  - Includes gate movements, builds, hinges, latches, drop bolts, gate stops, and default gate variables.

- `src/lib/segmentTermination.ts`
  - Shared termination keys and helpers for system posts, wall/existing fence terminations, corners, and gate stubs.

- `src/lib/runStats.ts`
  - Summary calculations for runs, segments, panels, posts, and gate counts.

- `src/lib/suggestedAccessories.ts`
  - Suggests extras based on selected systems, mounting methods, colours, and BOM output.

## State And Context

- `src/context/CalculatorContext.tsx`
  - Active v3 state: canonical payload and latest BOM result.
  - Reducer actions include setting payload, setting/clearing BOM, clearing quote, upserting/removing runs and segments.

- `src/context/ThemeContext.tsx`
  - Light/dark theme state.

- `src/context/FenceConfigContext.tsx`, `GateContext.tsx`
  - Older context surfaces used by the legacy `/new` flow and some historical components. Check route/component usage before extending.

## Supabase Database And Seeds

### Migrations

- `supabase/migrations/001_create_organisations.sql` through `023_selector_qty_key.sql`
  - Create organisations, profiles, quotes, products, components, pricing rules, v3 rule engine tables, quote run/segment persistence, RLS, and selector quantity support.

### Seed Files

- `supabase/seeds/glass-outlet/products/qshs.json`
  - QuickScreen horizontal slat fence data, components, rules, selectors, companions, pricing.

- `supabase/seeds/glass-outlet/products/vs.json`
  - Vertical slat fence data.

- `supabase/seeds/glass-outlet/products/xpl.json`
  - XPress Plus fence data. XPress Plus gate frame systems are not meant to be revived, but XPL fence remains required.

- `supabase/seeds/glass-outlet/products/bayg.json`
  - Alumawood/BAYG data.

- `supabase/seeds/glass-outlet/products/qs_gate.json`
  - Shared QuickScreen gate product data.
  - Current QSG direction is based on `CTS+QSG+Pedestrian+Gates~V3-T1 (1).xlsx`: pedestrian gates should use QSG side frames and normal QSG 65/90 gate rails, not the discontinued XP gate frame system and not sliding-gate HD rail.

- `supabase/seeds/glass-outlet/products/gate_legacy.json`
  - Historical gate data. Do not extend unless intentionally migrating old rules.

- `supabase/seeds/glass-outlet/products/other.json`
  - Inactive/other product families.

### Seed Tooling

- `supabase/seeds/tools/seed-products.js`
  - Validates product JSON against schemas and upserts products, components, pricing, variables, rules, selectors, companions, validations, and warnings.

- `supabase/seeds/tools/dump-to-json.js`
  - Dumps database seed data back to JSON.

- `supabase/seeds/schemas/*.schema.json`
  - JSON schemas for seed authoring and validation.

## Saved Jobs And Quotes

- `CalculatorV3Page.tsx` builds a quote payload containing job name, canonical payload, BOM result, and quote metadata.
- When logged in with Supabase configured, it inserts into `quotes`.
- It then inserts run payloads into `quote_runs`.
- It then inserts segment payloads into `quote_run_segments`.
- If a BOM was generated, the saved quote includes the BOM with edited quantities and extra items.

## Export And Print

- CSV export is handled in `CalculatorV3Page.tsx` using `Papa.unparse`.
- Print uses the browser print flow from the calculator page.
- Older PDF quote components exist under `src/components/quote/`; verify current route usage before extending.

## Local Development Commands

- `npm run dev` starts Vite on the local dev port.
- `npm run build` runs TypeScript and production Vite build.
- `npm run cy:open` opens Cypress.
- `npm run cy:run` runs Cypress against the React app.
- `npm run seed:products` validates and upserts product JSON to Supabase.
- `npm run db:reset` resets local Supabase and reloads product/auth seeds.
- `npm run setup` starts Supabase and resets/seeds local data.

## Testing And Verification

Minimum checks after code changes:

- `npm run build`
- `git diff --check`
- Open or request the local app at `http://127.0.0.1:5173/calculator`

Recommended checks after calculator logic changes:

- Generate BOM for QSHS horizontal, VS vertical, XPL fence, and BAYG/Alumawood where touched.
- Test quantity edits in the BOM and confirm line totals update.
- Test selected BOM tab totals: all items, run-only, gates-only.
- Test gate placement in the mapper: middle of segment, start of segment, end of segment, and corner.
- Compare outputs against formulated Excel sheets before locking rules into backend seeds.

## Documentation Map

- `discovery.md`
  - Chronological learning/build journal. Update after meaningful decisions, fixes, test results, and user workflow findings.

- `docs/tasks.md`
  - Phase and task tracker. Update after completed task groups.

- `docs/how_it_works.md`
  - Plain-English v3 engine overview.

- `docs/seed-data-mapping-spec.md`
  - Contract for authoring product JSON seed files.

- `docs/phase-v3-*.md`
  - Deeper phase documents for engine migrations, seeds, canonical payload, edge function, calculator UI, BOM output, and docs.

- `docs/app-overview.md`
  - This living map of app files, responsibilities, and current runtime behavior.

## Update Rules For This File

Update this overview whenever:

- A file becomes the main owner of a workflow.
- A route changes.
- A new product family, gate type, or calculator is added.
- A local fallback rule is moved into backend seed data.
- Supabase schema or seed structure changes.
- Canvas mapper behavior changes.
- Save/export behavior changes.
- A legacy component is removed or revived.

Keep this file practical. Prefer short explanations of what each file owns and where to edit next.
