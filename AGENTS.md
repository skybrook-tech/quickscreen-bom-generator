
# QuickScreen BOM Generator — Architecture & Development Guide

> **Purpose**: Single source of truth for working on this codebase. Covers business rules, architecture decisions, security constraints, and active guardrails. For implementation history and task tracking, see `docs/tasks.md` and `docs/phase-*.md`.

---

## 1. Project Overview

### What This App Does

QuickScreen is a **Bill of Materials (BOM) generator** for aluminium slat screening/fencing systems. Built for **The Glass Outlet** (a fencing supplier), branded under **SkybrookAI**.

Staff and trade customers can:

1. **Draw a fence layout** on a canvas (with optional Google Maps satellite underlay)
2. **Configure fence specifications** — system type, length, height, slat size, gap, colour, posts, corners
3. **Configure gates** — swing/sliding, dimensions, hardware (hinges, latches), posts
4. **Generate a priced BOM** — every post, rail, slat, bracket, screw, and accessory with quantities and pricing
5. **Export quotes** — CSV, pdf, saved quotes per user

> **Deferred to v2**: AI job description parsing (natural language → form fill) and AI BOM review (Claude sanity check on generated BOM). Do NOT build these.

### Current State

**Phases 0–7 are complete (Phase 7 included V1 removal). The live calculator is the "static engine" — a code-configured (not DB-driven) BOM engine.** The React app is the primary codebase.

> **⚠️ Architecture note.** An earlier plan built a *fully data-driven* engine (`bom-calculator` reading rules from seeded Postgres tables). That approach was abandoned and **its code, DB rule tables, and seed sections have all been deleted** (migration compaction, 2026-07) — specs remain in [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/). The live engine is `bom-calculator-static` + `get-calculator-config`, configured by TypeScript + per-product JSON **field files** under `supabase/functions/bom-calculator-static/config/`. The canonical live-architecture reference is [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md); the agreed forward direction (vendor model, price freezing) is [`docs/vendor-model-plan.md`](docs/vendor-model-plan.md).

- See `docs/tasks.md` for the full current task status.

### Routes — V3 only (v1 + v4 removed)

v2 was retired in an earlier cleanup. v1 was removed — the `/new` route, `MainApp`, `calculate-bom` edge function, and all V1 UI components. The parallel `/fence-calculator-v4` experiment (`CalculatorV4Page`, `CalculatorContextV4`, `calculator-v4/`) was also removed. V3 is the sole calculator surface.

| Path | Page | Edge functions | Purpose |
|---|---|---|---|
| `/` | — | — | Redirects to `/fence-calculator`. |
| `/fence-calculator`, `/calculator`, `/quote/:quoteId` | `CalculatorV3Page` | `bom-calculator-static` (BOM) + `get-calculator-config` (fields) | Static BOM engine. The calculator function (`config/calculators/`) is product-agnostic; per-product behaviour lives in code-configured `BASE_CONFIGS` (`config/base.ts`) + JSON field files (`config/products/*/fields.json`). Searchable fence product picker + gate list modal + typeahead extra-items panel. Scope: **QSHS/VS/XPL/BAYG slat fences + COLORBOND steel fence + QS_GATE gate**. Adding a fence family = new field file + config registration (see § "Add a fence family"). |

### Current Architecture

- **React + Vite** SPA with **Tailwind CSS** (dark theme)
- **Supabase** backend: Auth, Postgres DB, Edge Functions
- **TanStack Query** for server state management
- **React Context + useReducer** for client state (fence config, gate list, UI state)
- **All pricing and BOM calculation logic in Supabase Edge Functions** (IP protection)
- **The static engine is fencing-agnostic** — the calculator code (`bom-calculator-static/config/calculators/`) has no per-product branches; it reads the resolved `CalculatorConfig` (strategy, option lists, height ladder, panel/gate rules). Per-product behaviour is code+data config, not seeded DB rules. The client fetches the same resolved config via `get-calculator-config` (see `useCalculatorConfig`), and `useRunReconciliation` reconciles run variables to the config's `normalisedVariables` — so client code no longer branches on product codes. The form and canvas toolbar are shared hand-coded UI for all fencing systems.

---

## 2. Tech Stack

| Layer          | Technology                                 | Purpose                                                  |
| -------------- | ------------------------------------------ | -------------------------------------------------------- |
| Framework      | React 19 with Vite                         | SPA build tooling, HMR, fast dev                         |
| Styling        | Tailwind CSS 3                             | Utility-first CSS, light/dark theme (`docs/ui-theme.md`)   |
| Server State   | TanStack Query v5                          | Caching, mutations for all Supabase calls                |
| Client State   | React Context + useReducer                 | Fence config, gate list, UI accordion/modal state        |
| Auth           | Supabase Auth                              | Email/password, session management, RLS                  |
| Database       | Supabase Postgres                          | Quotes, pricing tiers, product catalog                   |
| Edge Functions | Supabase Edge Functions (Deno)             | BOM calculation, pricing — **all sensitive IP here**     |
| Forms          | React Hook Form + Zod                      | Complex fence/gate forms with conditional validation     |
| Canvas         | Vanilla JS (ported from existing app)      | Fence layout drawing tool — wrapped via useRef+useEffect |
| Maps           | Google Maps JS API (loaded via script tag) | Satellite underlay for fence layout                      |
| PDF Export     | @react-pdf/renderer                        | Quote PDF generation                                     |
| CSV Export     | Papaparse                                  | CSV export of BOM                                        |
| Routing        | React Router v7                            | Auth pages, main app, quote viewer                       |
| Icons          | Lucide React                               | Consistent icon set                                      |
| Toasts         | Sonner                                     | Notifications for save/copy/error events                 |

---

## 3. Project Structure

Source lives in `src/` with these top-level directories: `components/` (admin, auth, brand, calculator, calculator-v3, canvas, fence, gate, layout, quote, shared, ui), `context/`, `hooks/`, `lib/`, `pages/`, `schemas/`, `types/`, `utils/`.

Edge functions are in `supabase/functions/`: `bom-calculator-static` (the BOM engine), `get-calculator-config` (resolves field/option config for the client), `search-products`, plus `_shared` (auth + CORS helpers). The old data-driven engine functions (`bom-calculator`, `calculate-pricing`) have been **deleted** — specs live in [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/).

The live engine's configuration lives entirely under `supabase/functions/bom-calculator-static/`:
- `config/base.ts` — `BASE_CONFIGS` (one `CalculatorConfig` per product) + `PRODUCT_FIELD_FILES` registry
- `config/types.ts` — **`CalculatorConfig` is a common core + optional per-strategy blocks**: `slat?: SlatConfig` (internal SKUs, stock lengths, geometry, pack sizes, post/mounting/gap rules — everything only the QuickScreen calculator reads) and `colorbond?: ColorbondConfig`. A new product kind adds its own optional block; it never carries another strategy's fields.
- `config/products/<code>/fields.json` — per-product field/option definitions (QSHS, VS, XPL, BAYG, QS_GATE, COLORBOND)
- `config/resolve.ts`, `config/normalise.ts`, `config/merge.ts` — resolve base config + variables into the UI-safe projection returned by `get-calculator-config`. The client wire shape (`UiCalculatorConfig`) stays FLAT — slat-only slices (`gapRules`, `heightLadder`) are synthesized with defaults for slat-less products, so the client never sees the server's config split.
- `calculators/registry.ts` + `calculators/quickscreen.ts` + `calculators/colorbond.ts` — calculators keyed by `productCode`; each guards on its strategy block (`cfg.slat` / `cfg.colorbond`)
- `calculators/shared.ts` — `applyExtraRules`, the **typed extension hook**: new rule TYPES (e.g. `extra_component_above_height`, `warning`, `variable_warning`) are added in code with tests; products/suppliers only supply values via `config.extraRules` (e.g. Colorbond depot-availability warnings). Never reintroduce a generic expression language here.
- `engine.ts` — aggregation, pricing, BOM metadata, suggested accessories (slat-gated). **DB-only**: components + pricing come exclusively from the DB ctx; with no ctx (offline/tests) runs are UNPRICED ($0, correct SKUs/quantities). The former "synthetic" catalogue lives in `engine_test_fixtures.ts` (test-only) so the snapshot suite stays price-bearing.

Database migrations are in `supabase/migrations/` — a **single squashed `001_init.sql`** (2026-07 compaction of the former 001–032: schema dump minus the dead rule-engine tables, plus the hand-appended `on_auth_user_created` trigger on `auth.users` and the ACL pins for the no-RLS pricing tables — pg_dump captures neither). New schema changes are new numbered migrations on top of it.

**DB seeds** (via `supabase db reset`): `supabase/seeds/organizations.sql` (the org) plus the **per-product JSON files** under `supabase/seeds/glass-outlet/products/*.json` and `price_catalogue.json`, applied by `seed-products.js`. Files contain LIVE sections only: `products`, `product_components`, and `pricing_rules` (the static engine reads these from the DB); the old rule-engine sections were stripped in the 2026-07 compaction. To change live calculation behaviour, edit the static engine config (above); to change catalogue/pricing facts, edit the seed JSON.

`seed-auth.js` and `seed-images.js` handle auth users and image uploads respectively.

v3-specific additions:
- `src/pages/CalculatorV3Page.tsx` — `/fence-calculator` route
- `src/components/calculator-v3/` — shared fence config form, multi-run UI, warnings/trace/achieved-height panels
- `src/hooks/useBomCalculator.ts`
- `src/types/canonical.types.ts`, `src/schemas/canonical.schema.ts`
- `src/components/canvas/canonicalAdapter.ts`

Run `ls src/` or `ls src/components/` for the current file list — the directory has evolved beyond the original plan.

---

## 4. Business Rules & Validation

**Where rules live (LIVE path):** field/option definitions and their conditional cascades are in `supabase/functions/bom-calculator-static/config/products/<code>/fields.json` (`options_when_json`, `visible_when_json`, `snap_*`); numeric/geometry rules (colour sets, height ladders, panel rules, gate rules, stock lengths, pack sizes) are in `config/base.ts` per-product `BASE_<CODE>_CONFIG`; invalid variables are snapped server-side by `config/normalise.ts` (`normaliseVariables`) — both in `get-calculator-config` (client display) and in `engine.ts` per run before calculation. **To change or check a rule, read those files — not the client.**

> ⚠️ **Legacy schemas**: `src/schemas/fence.schema.ts` / `gate.schema.ts` and `FenceConfigContext` are v1-era leftovers still imported by legacy canvas/gate components and quote metadata. They are NOT where live validation happens — do not add rules there.

### Key business facts (as encoded in the live config)

- **XPL forces 65mm slats**; economy finish restricts to 65mm and the economy colour palette; alumawood+90mm restricts colours to WRC — all via `options_when_json` cascades, snapped by `normaliseVariables`.
- **Swing gates (single/double) always use 65mm blades** — 90mm slats are sliding-gate-only.
- **Max recommended swing gate width**: 1200mm. Standard gate heights: 900–2100mm ladder.
- **Panel width**: `panelRules.maxPanelWidthMm` per product (QSHS 2600, BAYG 3000, COLORBOND 3125); `clampPostSpacing` (`src/lib/postSpacing.ts`) clamps client-side.
- **Heights**: `heightUi.mode` per product — `"ladder"` (slat-derived, QSHS/VS/XPL), `"options"` (discrete manufactured heights, COLORBOND 1500/1800/2100), or `"freeform"`. See § 6a for the N:0 sentinel gotcha.
- **Stock lengths** are config (`slat.stockLengths` in `base.ts`), e.g. slat 6100/6500/5800 by finish, rail 5800 fence.

### Colours — short codes, per-product sets

Variables and SKUs use **short codes** (`B`, `MN`, `G`, `SM`, `W`, `BS`, `D`, `M`, `P`, `PB`, `S`, `KWI`, `WRC`); long Colorbond brand names (`black-satin`, `monument-matt`, …) appear only in legacy schemas/UI labels (`COLOUR_NAMES` maps code→name). **Colour sets differ per product** (`colours.standard/economy/alumawood/gate` in `base.ts`): e.g. QSHS standard includes `B`, but COLORBOND's set is `MN/G/SM/BS/PB/P` — **no `B`**. Colour codes are interpolated directly into SKU templates (`CB-GLINE-{sheetHeight}-{colour}`), so an out-of-set colour silently produces a nonexistent SKU that prices at $0 (see § 15 debugging).

### Gate hardware

- **Hinges**: dd-kwik-fit-fixed, dd-kwik-fit-adjustable, heavy-duty-weld-on
- **Latches**: dd-magna-latch-top-pull, dd-magna-latch-lock-box, drop-bolt, none
- **Post sizes**: 50×50, 65×65, 75×75 _(confirm stock)_, 100×100 _(confirm stock)_

---

## 5. Database Design

Every table includes `org_id`. RLS policies use `public.user_org_id()` (a `SECURITY DEFINER STABLE` function on profiles) to scope all access. Never trust client-sent `org_id` — always resolve from the authenticated user's JWT.

The schema lives in a **single squashed migration** (`supabase/migrations/001_init.sql`, 2026-07 compaction — the former 001–032 numbering survives only in git history). Nine tables + one view:

| Table / View                | Key design notes                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organisations`             | Glass Outlet org seeded by `seeds/organizations.sql` (`slug = 'glass-outlet'`). No RLS.                                                              |
| `profiles`                  | `public.user_org_id()` helper; `on_auth_user_created` trigger on `auth.users` defaults new users to Glass Outlet org. `user_role` enum (`user`/`staff`/`admin` — admin unlocks trace panel). |
| `quotes`                    | RLS: users see **all org quotes** (staff visibility), but can only insert/update/delete their own. `bom` JSONB freezes the priced summary at save.   |
| `quote_runs`, `quote_run_segments` | Persistent canonical payload for quotes. FK → `quotes.id`. RLS matches `quotes` pattern. No per-line prices (see `docs/vendor-model-plan.md` § 3). |
| `products`                  | FLAT (no parent/variant hierarchy); `product_type` distinguishes fence/gate/other; `image_url` via `seed-images.js`. RLS+grant: `authenticated` SELECT (metadata only). `chk_system_types_values` on `product_components` constrains allowed codes (currently QSHS/VS/XPL/BAYG/GATE/COLORBOND — extending it = new migration). |
| `product_components`        | **No RLS** (table grants only: no `anon`; `authenticated` read/write for the admin UI). Single source of truth per SKU; SKU unique per org; `internal_sku` column remaps canonical internal SKUs → supplier SKUs. |
| `pricing_rules`             | **No RLS** (same grant posture). `component_id` FK, `tier_code` (tier1/2/3), `rule` (only `qty >= N`-style quantity gates are evaluated — see engine `matchesPriceRule`), `price`, `priority`. |
| `pricing_rules_with_sku`    | View joining `pricing_rules` + `product_components`. Used by edge functions for sku-based lookups. No `anon`/`authenticated` grants (service role only). |
| `supplier_product_calculator_configs` | Per-org sparse `CalculatorConfig` JSONB patches, deep-merged over `BASE_CONFIGS` at request time (`config/merge.ts`). Org-read RLS, service-role write. |

The dead data-driven-engine tables (`rule_sets`, `rule_versions`, `product_rules`, `product_constraints`, `product_validations`, `product_variables`, `product_component_selectors`, `product_companion_rules`, `product_warnings`) and `colour_options` were **dropped in the compaction** — schemas documented in [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/) and recoverable from git history.

⚠️ When adding migrations on top of `001_init.sql`: Supabase's `ALTER DEFAULT PRIVILEGES` grants ALL to `anon`/`authenticated` on every new table — tables holding pricing IP without RLS must explicitly REVOKE (see the ACL block at the end of `001_init.sql`), and anything on the `auth` schema (triggers) is never captured by `supabase db dump`.

---

## 5a. Live engine configuration (static engine)

The live BOM engine (`bom-calculator-static`) is **not** driven by DB rule tables — it is configured in code under `supabase/functions/bom-calculator-static/config/` (the DB supplies only catalogue facts: components, prices, per-org config-override patches). The retired data-driven engine's rule tables were dropped in the 2026-07 compaction; see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/) if you need their shapes.

| Config artefact | Purpose |
|---|---|
| `config/base.ts` → `BASE_CONFIGS` | One `CalculatorConfig` per product (defaults, strategy, panel/gate rules, colours, display) |
| `config/products/<code>/fields.json` | Per-product field + option definitions (the client renders these) |
| `config/resolve.ts` / `normalise.ts` / `merge.ts` | Resolve base config + variables → UI-safe projection (`get-calculator-config` output) |
| `calculators/registry.ts` + `quickscreen.ts` + `colorbond.ts` | Calculators keyed by `productCode`; each guards on its strategy block |
| `engine.ts` | Run dispatch + per-run variable normalisation, line aggregation, pricing |

**To change live calculation behaviour:** edit the config artefacts above and redeploy the function. See [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md) and § "Add a fence family" below.

---

## 6. Supabase Edge Functions

### Org-scoping pattern (required in every edge function)

```typescript
const {
  data: { user },
} = await supabaseAdmin.auth.getUser(jwt);
const { data: profile } = await supabaseAdmin
  .from("profiles")
  .select("org_id, pricing_tier")
  .eq("id", user.id)
  .single();
const orgId = profile.org_id;
// Then scope all queries: .eq('org_id', orgId)
```

### bom-calculator-static (LIVE — product-agnostic)

`POST /functions/v1/bom-calculator-static` — accepts `{ payload: CanonicalPayload, pricingTier? }`, returns the priced `CalculatorBOMResult` (`lines`, `runResults`, `gateItems`, `totals`, `warnings`, `errors`, `assumptions`, `computed`, `trace?`, `pricingTier`, `generatedAt`). Called by `src/hooks/useBomCalculator.ts`.

**Pipeline (code-configured; no per-product branches in the engine):**

1. CORS + JWT → resolve `{ orgId, role, pricingTier }`
2. Validate payload (Zod)
3. Load `product_components` + `pricing_rules_with_sku` **org-wide** (paginated `loadAllPages` — PostgREST caps at 1000 rows/page; there is NO per-product filter, the whole org catalogue is always in ctx) and the resolved `CalculatorConfig` per `productCode` from `config/` (`merge` BASE_CONFIGS + supplier overrides → `resolve`/`normalise`)
4. Per run: `normaliseRunVariables` snaps the run's effective variables to its product's config (safety net for invalid inherited values, e.g. a colour carried across a product switch), then dispatch to the calculator from `calculators/registry.ts` (`QSHS/VS/XPL/BAYG` → `quickScreenCalculator` branching on `config.strategy.fence`; `COLORBOND` → `colorbondCalculator`)
5. Resolve internal → supplier SKUs + companions; aggregate lines by SKU; tag with `runId`/`segmentId`/`productCode`; split into `runResults[]`
6. Warnings/errors/assumptions collected; **pricing stage last + non-fatal** (missing price → `unitPrice=0` + `"No local price found for SKU …"` assumption, BOM still returned — a $0 line means the emitted SKU string isn't in the org catalogue, usually a template-interpolation mismatch, not a load failure)
7. Strip `trace`/most of `computed` for non-admin

**Trace gating:** `role === 'admin'` → full `trace[]` + `computed{}`. Non-admin → `trace: []` and only `actual_height_mm` retained in `computed` (needed by `AchievedHeightBadge`).

See [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md) for the full contract.

### get-calculator-config (LIVE)

`POST /functions/v1/get-calculator-config` — accepts `{ productCode?, variables? }`, returns the resolved `UiCalculatorConfig` (fields with concrete `options_json`, `strategy`, `gapRules`, `panelRules`, `gateRules`, height ladder, and `normalisedVariables`). Reads `BASE_CONFIGS` + per-product field files, resolves against the passed variables, and strips authoring-only keys. Consumed by `src/hooks/useCalculatorConfig.ts`; it is the single source of truth for form fields and option lists in the client. `useRunReconciliation` uses its `normalisedVariables` to correct run variables after load — so no client-side per-product normalisation is needed.

### Removed functions

`bom-calculator` (the fully data-driven engine) and `calculate-pricing` have been **deleted from the repo** (2026-07), and their DB rule tables were **dropped in the migration compaction** (2026-07). Their pipeline specs live in [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/) for reference.

---

## 6a. Runs, segments & mixed products (v3 state model)

The canonical payload is `{ runs: CanonicalRun[], variables: {} }` (v3 no longer uses payload-level variables). Each run has `productCode`, `variables`, and `segments[]`. **Read this before touching product-switch, height, or segment-override code** — the flow is subtle:

- **Per-section product override**: a segment can use a different product than its run via `seg.variables.product_code` (NOT the top-level `seg.productCode` — that's a v4 leftover). `null`/absent = inherit the run's product. Effective segment variables everywhere are `{ ...run.variables, ...seg.variables }`.
- **Send-time expansion**: `expandSectionSystemOverrides` (`src/hooks/useBomCalculator.ts`) splits override segments into **synthetic runs** (`runId` = `${run.runId}-${code}`, spreading the parent run's variables) just before invoking `bom-calculator-static`. These synthetic runs exist only inside the mutation — they are never rendered, never in state, and never client-reconciled. Anything that must hold for them has to be guaranteed at write time (segment state) or server-side (`normaliseRunVariables`).
- **Reconciliation scope**: `useRunReconciliation` (called once per run in `RunCardInner`) diffs `config.normalisedVariables` against **run** variables only and dispatches `UPSERT_RUN`. It **never touches segment variables** — segment values are only corrected when written (see next point) plus the server safety net.
- **Section product switch** (`FenceSegmentDetails.onSystemTypeChange`): switching a section AWAY from the run product sets its variables to the target product's **full defaults** (`configForProduct(allConfigs, code).normalisedVariables`) + `product_code`; switching BACK empties them so it inherits the run. **Height & width are preserved** across the switch; height is snapped to the target product's ladder via `nearestDerivedHeight`.
- **State mechanics**: `patchSegmentVariables` (`src/lib/segmentTermination.ts`) only **merges** (`null`/`undefined`/`""` deletes that one key) — to replace or empty a segment's whole variable set, build the segment object and dispatch it directly; the `UPSERT_SEGMENT` reducer **replaces the whole segment**. New runs/scopes are seeded from `normalisedVariables` (see `buildInitialFencePayload` in `src/lib/newQuotePayload.ts`).
- **Height & width storage**: width = top-level `seg.segmentWidthMm` only. Height is stored **redundantly**: top-level `seg.targetHeightMm` AND `variables.target_height_mm` + `variables.slat_count` (gates also `gate_height_mm`). `slat_count` is a ladder-derivation artifact; **options-mode ladders (COLORBOND) emit every entry with the `N: 0` sentinel** — `derivedHeightForSlatCount` (`src/lib/heights.ts`) treats `n <= 0` as "no slat count" so lookups fall through to `nearestDerivedHeight(target_height_mm)`. Don't re-introduce an `N === 0` match: it silently pins options-mode heights to the first entry.

---

## 7. Deferred Features (v2)

**Do NOT build these:**

1. **AI Job Description Parsing** — natural language → fence config via Claude API. Requires `parse-job-description` edge function with `ANTHROPIC_API_KEY`, `useAIParse` hook, `JobDescriptionParser` component.
2. **AI BOM Review** — BOM sanity check via Claude API. Requires `review-bom` edge function, `useAIReview` hook, `BOMReviewer` component.

When v2 is ready, the AI parse result should seed the v3 `CalculatorContext` payload (see the existing non-AI describe-fence parser: `src/lib/describeFenceParser.ts` + `buildRunFromDescription`) — not the legacy `FenceConfigContext`.

---

## 8. Canvas Layout Tool

The canvas tool is **a vanilla JS port, not a rewrite**. All drawing logic lives in `src/components/canvas/canvasEngine.ts` — pure TypeScript with no React imports. The React component (`FenceLayoutCanvas.tsx`) is a thin wrapper: mounts the `<canvas>` element via `useRef`, calls `initCanvasEngine()` in `useEffect`, and bridges toolbar/map control clicks to the engine API.

**React controls**: mounting/unmounting, toolbar button clicks (`engineRef.current?.setTool(...)`), "Use This Layout →" button (`engineRef.current?.getLayout()`), map control inputs.

**Canvas engine controls**: all drawing, mouse/touch events, internal state. Never imports React, never causes re-renders.

**Data flow**: `LayoutCanvasV3.tsx` wraps `FenceLayoutCanvas.tsx` unchanged. The toolbar is hand-coded — identical across all fencing systems. On layout change, `canvasLayoutToCanonical(layout, productCode, variables)` produces a `CanonicalPayload`. The reverse adapter `canonicalToCanvasLayout(payload)` handles quote reload. `runId` and `segmentId` are stable across round-trips — canvas, form, engine, and `quote_run_segments` all key on them.

Google Maps JS API loaded via `<script>` tag; the engine handles geocoding, tile fetching, and canvas underlay rendering.

---

## 9. UI & Theme

**Light and dark** themes: `ThemeProvider` toggles `data-theme` on `<html>`; colours come from CSS variables in `src/index.css` and Tailwind `brand-*` tokens (see `tailwind.config.js`). Full conventions: **`docs/ui-theme.md`**. Prefer `text-brand-text`, `text-brand-muted`, and form patterns from `src/components/ui/Input.tsx`—avoid raw `text-neutral-200`–`400` for copy on `brand-card` without explicit light/dark handling.

Layout: SkybrookAI branding top-left, Glass Outlet logo top-right. Accordion sections for progressive disclosure (Layout → Config → Gates → Contact → BOM).

Responsive: desktop-first. Canvas section hidden on mobile (`md:block`). BOM table horizontally scrollable on small screens.

---

## 10. Security & IP Protection Checklist

- [ ] **Move repo to private** on GitHub
- [ ] **All BOM calculation logic** in Supabase Edge Functions (never in client bundle)
- [ ] **All pricing data** in Supabase Postgres, accessed only via service role key in edge functions
- [ ] **`product_pricing` and `product_components` tables** have no RLS — revoke all access from `anon` and `authenticated` roles
- [ ] **Google Maps API key** restricted to your domain(s) in Google Cloud Console
- [ ] **Supabase anon key** only grants access to auth + quotes table (via RLS)
- [ ] **No sensitive constants** in client-side code (no margin percentages, no wholesale prices)
- [ ] **Rate limiting** on edge functions to prevent abuse
- [ ] **CORS** configured to allow only your deployment domain(s)
- [ ] **Every RLS policy** scopes by `org_id = public.user_org_id()` — no cross-org data leakage
- [ ] **Edge functions** resolve `org_id` server-side from the JWT user's profile — never trust client-sent `org_id`
- [ ] **The `public.user_org_id()` function** is `SECURITY DEFINER` and `STABLE` — verified working
- [ ] **Quote inserts** include the correct `org_id` from the user's profile, not from client input

---

## 11. Development Phases

**v1 Phases 0–7 complete** (Phase 7 included V1 code removal). The live calculator is the static engine; the fully data-driven engine was removed (see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/)). See `docs/tasks.md` for current status.

---

## 11a. Add a fence family (static engine)

Adding a fence system (e.g. HSSG, QSGH, a patio-as-fence) touches these registration points — it is **not** "one JSON seed file" (that was the parked data-driven plan). Reference: [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md).

**Edge (the calculation):**
1. `supabase/functions/bom-calculator-static/config/products/<code>/fields.json` — field + option definitions (copy an existing family as the template).
2. `config/types.ts` — if it's a new *kind* of product, add an optional per-strategy block (like `slat?` / `colorbond?`) holding its SKU templates + quantity rules; slat-likes reuse `SlatConfig`.
3. `config/base.ts` — register the field file in `PRODUCT_FIELD_FILES`, add a `BASE_<CODE>_CONFIG` (core fields + its strategy block; no other strategy's blocks), and add it to `BASE_CONFIGS`.
4. `calculators/registry.ts` — map the `productCode` to a calculator. Reuse `quickScreenCalculator` if `strategy.fence` fits (it guards on `cfg.slat`); otherwise add a new calculator file that guards on its own block. Use `calculators/shared.ts` `applyExtraRules` for typed warnings/add-ons.
5. Components + pricing are **seed data**, not engine code: add rows to the product's seed JSON (`supabase/seeds/glass-outlet/products/<code>.json`) and reseed.

**Client (display only — no calculation logic):** the calculator UI is product-agnostic (it renders the resolved config). The only per-product client touchpoints are the **label maps**: `src/lib/displayNames.ts`, `systemDisplay.ts`, `constants.ts`, `slugLabels.ts`, `installVideos.ts`.

**Gates** are a separate product (`QS_GATE`) shared across fences via `compatible_with_system_types`; a new fence pairs with the existing gate, no new gate config needed unless the hardware differs.

---

## 12. Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# Supabase secrets (set via `supabase secrets set` — NOT in .env)
# GOOGLE_MAPS_API_KEY=AIza...
# ANTHROPIC_API_KEY=sk-ant-...  (v2 only)
```

---

## 13. Key Decisions & Tradeoffs

| Decision                                             | Rationale                                                                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Context+useReducer over Zustand                      | Simpler dependency footprint. Upgrade to Zustand later if canvas re-renders become a problem.                        |
| Vanilla JS canvas port over react-konva              | The existing canvas tool works. A useRef+useEffect wrapper avoids rewriting ~500 lines and removes a dependency.     |
| Zod schemas shared between client and edge functions | Single source of truth for validation. Schemas are copied into `supabase/functions/_shared/` for Deno compatibility. |
| @react-pdf/renderer over jsPDF                       | JSX-based PDF templates are more maintainable. Matches the React mental model.                                       |
| All pricing server-side                              | Non-negotiable for IP protection. The client never knows wholesale costs or margin formulas.                         |
| Multi-tenant schema now                              | Adding `org_id` columns and RLS policies later requires rewriting every migration and query. Cost now: ~30 min.      |
| `public.user_org_id()` helper function                 | Centralises the org lookup. Every RLS policy calls this function — if logic changes, update one place.               |

---

## 14. Testing

**Engine tests (the real regression suite):** Deno unit tests for the live static engine — `engine_test.ts` (snapshot scenarios, fixture catalogue in `engine_test_fixtures.ts`), `config/resolve_test.ts` (config/normalise resolution), `calculators/colorbond_test.ts`. Deno is **not installed globally** — run via `npm run test:unit:static` (= `npx deno test --allow-read --allow-env supabase/functions/bom-calculator-static/`). Update snapshots after an *intentional* change with `npm run test:unit:static:update` and review the diff.

**DB integration tests:** `npm run test:integration` (= `integration_db_test.ts`, gated on `RUN_DB_TESTS=1`; needs `supabase start` + a seeded DB + `SUPABASE_SERVICE_ROLE_KEY` in env). Runs the edge function's own loaders (`db.ts`) + engine against the **seeded** catalogue and asserts on emitted components (sku + quantity — **prices deliberately ignored**, so price edits never break it). Covers what the offline suite can't: loader pagination past the PostgREST 1000-row cap and SKU resolution against real seeds. CI runs it in the `db-integration` job. Update the hardcoded expectations only after an intentional calculation/catalogue change.

**Type check:** `npm run typecheck` (fast) or `npm run build` (typecheck + bundle — run before committing).

**Client tests:** Vitest tests are colocated (`*.test.ts(x)`), but ⚠️ **the jsdom vitest runner is currently broken repo-wide** (`html-encoding-sniffer`/`@exodus/bytes` ESM interop in node_modules — pre-existing). `npm run test` only targets `useGoogleMaps.test.tsx` and fails with `ERR_REQUIRE_ESM` before running anything. Don't treat that failure as caused by your change, and don't claim client-test coverage from it — verify client changes via `npm run build` + driving the app.

Cypress E2E coverage is a follow-up phase (`npm run cy:open`). `SchemaDrivenForm` emits `data-testid={field_key}` so future selectors can be written against the `/fence-calculator` route.

> The data-driven engine and its Deno tests (TC-V3-1…8) were deleted with the function — see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/).

---

## 15. Notes for Claude Code

- **Never put pricing numbers, margin percentages, or wholesale costs in client-side code.** Use obviously fake values (e.g. $1.00) with a `// TODO: real pricing in edge function` comment if needed during development.
- **The canvas is a vanilla JS port, not a rewrite.** `canvasEngine.ts` is pure TypeScript — no React, no JSX, no hooks. Do not refactor it using react-konva or any React canvas library.
- **Australian context**: Currency is AUD, GST is 10%, measurements are metric (mm for heights/widths, m for run lengths). Postcodes are 4 digits.
- **Colours are short codes with per-product sets** (see § 4). Live variables/SKUs use codes (`B`, `MN`, `BS`, …), and each product's valid set differs — always validate against the target product's `colours.*`/`normalisedVariables`, never assume a colour carries across products.
- **Multi-tenancy: every table has `org_id`.** Edge functions always scope queries by `org_id` resolved from the user's JWT. RLS policies use `public.user_org_id()`. The client never sends `org_id`.
- **Always update `docs/tasks.md` after completing any task or group of tasks.** Tick off `[x]`, update the Phases Overview table, and update the "Current Phase" header. Do this before responding to the user.
- **The live calculator is the static engine, not the DB-driven one.** To change calculation behaviour, edit the config under `supabase/functions/bom-calculator-static/config/` (see § 5a) — the DB rule tables no longer exist (dropped in the 2026-07 compaction). The `supabase/seeds/glass-outlet/products/*.json` files contain only LIVE sections (`products` / `product_components` / `pricing_rules` — the engine prices from these DB rows): edit + `npm run seed:products` to change catalogue/pricing facts.
- **Client code must not branch on product code.** Fetch the resolved `UiCalculatorConfig` via `useCalculatorConfig` (single product) or `useAllCalculatorConfigs` (map of every product, for seed/product-switch paths that need a *target* product's config) and read `strategy.fence`, `gapRules`, `panelRules`, `gateRules`, resolved field `options_json`, and `normalisedVariables`; let `useRunReconciliation` snap run variables to `config.normalisedVariables` after a change. The legacy `src/lib/productOptionRules.ts` has been **removed** — there is no client-side per-product normaliser. (`clampPostSpacing` lives in `src/lib/postSpacing.ts`.)
- **Products table is flat** (post migration 022). No parent/variant hierarchy — every product has `parent_id = NULL`. The `product_type` column distinguishes fences from gates from other catalog items. Don't reintroduce a `WHERE parent_id IS NULL` filter.
- **Admin trace access** requires `profiles.role = 'admin'`. The seeded `admin@glass-outlet.com` / `123456` user has it. New admins: `UPDATE profiles SET role = 'admin' WHERE email = ...`.
- **Legacy routes are gone.** `/new` (v1 `MainApp` + `calculate-bom`) and `/fence-calculator-v4` (`CalculatorV4Page` + `CalculatorContextV4` + `calculator-v4/`) have been removed. The only calculator route is `/fence-calculator` (`CalculatorV3Page`), backed by `bom-calculator-static` + `get-calculator-config`.
- **Canonical payload** is the single JSON shape shared by canvas, form, engine, and `quote_runs`/`quote_run_segments`. `runId` and `segmentId` are stable across round-trips. Do not regenerate them in adapter code — that breaks load/save. See `docs/canonical-payload.md`.
- **Debugging $0 / unpriced BOM lines** — work the chain in this order before writing code: (1) components + pricing load **org-wide** (§ 6), so "only one product's pricing loaded" is never the cause; (2) check the data is seeded: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select sku, default_price from product_components where sku like 'CB-%' limit 5"` (local DB is on **54322**; API on 54321); (3) if seeded, the emitted SKU string doesn't match a catalogue row — diff the SKU template interpolation (colour code, height, width tokens in `config/base.ts` `skus:` templates) against the seeded SKUs. Invalid inherited variables (product switches) are the classic cause.
- **Verify claims against the running system, not just docs.** `docs/tasks.md` is an append-only log and its older entries can contradict current code (files listed as deleted may have been re-added). The engine config (`config/base.ts` + `fields.json`), the DB (psql), and a live edge-function call outrank any doc. When behaviour differs between products, diff their `BASE_<CODE>_CONFIG` blocks first — most "bugs" are config-set mismatches, not calculator logic.
- **Verification bar for calculator changes**: `npm run test:unit:static` green + `npm run build` green, and for anything touching run/segment state, drive `/fence-calculator` in the app (client reducer/UI paths have no working automated coverage — § 14).

---

## 16. Local Setup (new developers)

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) — `brew install supabase/tap/supabase` (Mac) or `npx supabase` (cross-platform)
- Git

### First-time setup

```bash
npm install
cp .env.local.example .env.local
# Fill in .env.local — run `supabase start` then `supabase status` to get the keys
npm run setup       # starts local Supabase + resets DB + seeds data
npm run dev         # → http://localhost:5173
```

Login with a seeded test account:
- `test@glass-outlet.com` / `123456` — regular user
- `admin@glass-outlet.com` / `123456` — admin (needed to see the v3 trace panel at `/fence-calculator`)

### Day-to-day commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app (http://localhost:5173) |
| `npm run build` | TypeScript check + bundle — run before committing |
| `npm run typecheck` | TypeScript check only (fast) |
| `npm run test:unit:static` | Engine regression suite (Deno via npx — see § 14) |
| `npm run db:reset` | Reset DB to a clean seeded state |
| `npm run seed:products` | Re-apply product/component/pricing seed JSON only |
| `supabase start` / `supabase stop` | Start/stop the local Supabase backend (DB on 54322, API on 54321) |
| `npm run cy:open` | Open Cypress interactive test runner |

### Git workflow

**Never push directly to `master`.** Always work on a branch and open a Pull Request:

```bash
git checkout -b my-feature-branch
# ... make changes ...
git add <files>
git commit -m "describe what you changed"
git push origin my-feature-branch
# → open a PR on GitHub; wait for CI to pass and get a review before merging
```

### Troubleshooting

- **`supabase start` fails / port 54321 in use** — run `supabase stop` first, then retry
- **Port 5173 in use** — kill the existing `npm run dev` process and restart
- **`npm run setup` errors on seed step** — ensure `supabase start` completed successfully first; check `supabase status`
- **Login not working** — run `npm run db:reset` to re-seed the test user
