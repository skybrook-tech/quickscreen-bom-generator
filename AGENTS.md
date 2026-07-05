
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

> **⚠️ Architecture note.** An earlier plan built a *fully data-driven* engine (`bom-calculator` reading rules from seeded Postgres tables). **That is NOT the live path** and has been parked — see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/). The live engine is `bom-calculator-static` + `get-calculator-config`, configured by TypeScript + per-product JSON **field files** under `supabase/functions/bom-calculator-static/config/`. The canonical live-architecture reference is [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md).

- See `docs/tasks.md` for the full current task status.

### Routes — V3 only (v1 + v4 removed)

v2 was retired in an earlier cleanup. v1 was removed — the `/new` route, `MainApp`, `calculate-bom` edge function, and all V1 UI components. The parallel `/fence-calculator-v4` experiment (`CalculatorV4Page`, `CalculatorContextV4`, `calculator-v4/`) was also removed. V3 is the sole calculator surface.

| Path | Page | Edge functions | Purpose |
|---|---|---|---|
| `/` | — | — | Redirects to `/fence-calculator`. |
| `/fence-calculator`, `/calculator`, `/quote/:quoteId` | `CalculatorV3Page` | `bom-calculator-static` (BOM) + `get-calculator-config` (fields) | Static BOM engine. The calculator function (`config/calculators/`) is product-agnostic; per-product behaviour lives in code-configured `BASE_CONFIGS` (`config/base.ts`) + JSON field files (`config/products/*/fields.json`). Searchable fence product picker + gate list modal + typeahead extra-items panel. Scope: **QSHS/VS/XPL/BAYG fences + QS_GATE gate**. Adding a fence family = new field file + config registration (see § "Add a fence family"). |

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

Source lives in `src/` with these top-level directories: `components/` (auth, bom, calculator, calculator-v3, canvas, contact, fence, gate, layout, quote, shared, wizard), `context/`, `hooks/`, `lib/`, `pages/`, `schemas/`, `types/`, `utils/`.

Edge functions are in `supabase/functions/`. **Live:** `bom-calculator-static` (the BOM engine), `get-calculator-config` (resolves field/option config for the client), `search-products`. **Parked/dead** (no client references, kept for possible revival): `bom-calculator` (the fully data-driven engine) and `calculate-pricing` — see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/). `_shared` holds cross-function helpers.

The live engine's configuration lives entirely under `supabase/functions/bom-calculator-static/`:
- `config/base.ts` — `BASE_CONFIGS` (one `CalculatorConfig` per product) + `PRODUCT_FIELD_FILES` registry
- `config/products/<code>/fields.json` — per-product field/option definitions (QSHS, VS, XPL, BAYG, QS_GATE)
- `config/resolve.ts`, `config/normalise.ts`, `config/merge.ts` — resolve base config + variables into the UI-safe projection returned by `get-calculator-config`
- `calculators/registry.ts` + `calculators/quickscreen.ts` — product-agnostic calculators keyed by `productCode`
- `engine.ts` — component catalogue, aggregation, pricing

Database migrations are in `supabase/migrations/` (001–010 are shared catalog + pricing infrastructure; 011–014, 018–022 relate to the **parked** data-driven engine — see the deprecated docs — except migration 022's product flattening, which the catalog still uses).

**DB seeds** (via `supabase db reset`): `supabase/seeds/organizations.sql` (the org) plus catalog/pricing rows. The **per-product JSON files** under `supabase/seeds/glass-outlet/products/*.json` (`qshs.json`, `qs_gate.json`, etc.), the `seed-products.js` upserter, and `docs/_deprecated/data-driven-approach/seed-data-mapping-spec.md` feed the **parked** data-driven engine — they are NOT how the live calculator is configured. To change live calculation behaviour, edit the static engine config (above), not these seeds.

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

### Fence Configuration fields

`src/schemas/fence.schema.ts` — key fields: `systemType` (QSHS/VS/XPL/BAYG), `totalRunLength` (m, positive), `targetHeight` (300–2400mm), `slatSize` (65/90mm), `slatGap` (5/9/20mm), `colour`, `maxPanelWidth` (2600/2000mm), `leftTermination`/`rightTermination` (post/wall), `postMounting` (concreted-in-ground/base-plated/core-drilled), `corners` (int ≥ 0).

### Gate Configuration fields

`src/schemas/gate.schema.ts` — key fields: `gateType` (single-swing/double-swing/sliding), `openingWidth`, `gateHeight` (match-fence or 600–2400mm), `colour`/`slatGap`/`slatSize` (match-fence or explicit), `gatePostSize` (50×50/65×65/75×75/100×100), `hingeType`, `latchType`.

### Validation rules enforced in reducer and form

- **XPL system forces 65mm slats** — enforced in `FenceConfigContext` reducer on every SET_FIELD action
- **Swing gates (single/double) always use 65mm blades** — 90mm slats are only available for sliding gates
- **Max recommended swing gate width**: 1200mm
- **Standard gate heights**: 900, 1050, 1200, 1500, 1800, 1950, 2100mm
- **Panel width options**: 2600mm (standard), 2000mm (high-wind areas)
- **Stock lengths**: slat 5800mm, rail 5800mm, post 3000mm (typical)

### Colours (Colorbond brand names — must be spelled exactly)

`black-satin`, `monument-matt`, `woodland-grey-matt`, `surfmist-matt`, `pearl-white-gloss`, `basalt-satin`, `dune-satin`, `mill`, `primrose` _(limited)_, `paperbark` _(limited)_, `palladium-silver-pearl`

### Gate hardware

- **Hinges**: dd-kwik-fit-fixed, dd-kwik-fit-adjustable, heavy-duty-weld-on
- **Latches**: dd-magna-latch-top-pull, dd-magna-latch-lock-box, drop-bolt, none
- **Post sizes**: 50×50, 65×65, 75×75 _(confirm stock)_, 100×100 _(confirm stock)_

---

## 5. Database Design

Every table includes `org_id`. RLS policies use `public.user_org_id()` (a `SECURITY DEFINER STABLE` function on profiles) to scope all access. Never trust client-sent `org_id` — always resolve from the authenticated user's JWT.

| Migration | Table / View                | Key design notes                                                                                                                                    |
| --------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001       | `organisations`             | Seeds Glass Outlet org (`slug = 'glass-outlet'`). No RLS.                                                                                           |
| 002       | `profiles`                  | `public.user_org_id()` helper; signup trigger defaults new users to Glass Outlet org.                                                                  |
| 003       | `quotes`                    | RLS: users see **all org quotes** (staff visibility), but can only insert/update/delete their own.                                                   |
| 004       | `product_pricing` _(legacy)_| Renamed to `pricing_rules` in migration 008. Do not reference directly.                                                                             |
| 005       | `products`                  | **No RLS**. Root products + variants via `parent_id` FK. `UNIQUE(org_id, system_type) WHERE parent_id IS NULL`. `UNIQUE(parent_id, system_type) WHERE parent_id IS NOT NULL`. |
| 006       | `product_components`        | **No RLS**. Single source of truth per SKU: name, description, category, unit, default_price, system_types[], active. SKU unique per org.            |
| 007       | _(seed)_                    | Seed now populates `products`, `product_components`, and `pricing_rules` in new format.                                                              |
| 008       | `pricing_rules`             | **No RLS**. Rule-based pricing: `component_id` FK, `tier_code` (tier1/2/3), `rule` (math.js expression, NULL = always), `price`, `priority`.        |
| 008       | `pricing_rules_with_sku`    | View joining `pricing_rules` + `product_components`. Used by edge functions for sku-based lookups. No RLS (service role only).                       |
| 009       | `products` + image_url      | Adds `image_url` to products. Populated via `seed-images.js`.                                                                                        |
| 010       | `products` RLS              | `authenticated` SELECT on products (metadata only, no pricing).                                                                                      |
| 011–014   | `rule_sets`/`rule_versions`, `product_rules`/`_constraints`/`_validations`/`_variables`, `product_component_selectors`, `product_companion_rules`/`product_warnings` | **Parked data-driven engine** — tables exist but the live calculator does not read them. See [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/). |
| 018       | `quote_runs`, `quote_run_segments` | Persistent canonical payload for quotes. FK → `quotes.id`. RLS matches `quotes` pattern.                                                   |
| 019       | `user_role` enum            | Adds `admin` value for trace/debug panel access.                                                                                                     |

---

## 5a. Live engine configuration (static engine)

The live BOM engine (`bom-calculator-static`) is **not** driven by DB tables — it is configured in code under `supabase/functions/bom-calculator-static/config/`. The migration-011–014 engine tables (`product_rules`, `product_variables`, `product_component_selectors`, `product_companion_rules`, `product_warnings`, etc.) belong to the **parked** data-driven engine and are not read by the live path. See [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/) if you need their shapes.

| Config artefact | Purpose |
|---|---|
| `config/base.ts` → `BASE_CONFIGS` | One `CalculatorConfig` per product (defaults, strategy, panel/gate rules, colours, display) |
| `config/products/<code>/fields.json` | Per-product field + option definitions (the client renders these) |
| `config/resolve.ts` / `normalise.ts` / `merge.ts` | Resolve base config + variables → UI-safe projection (`get-calculator-config` output) |
| `calculators/registry.ts` + `quickscreen.ts` | Product-agnostic calculators, keyed by `productCode` |
| `engine.ts` | Component catalogue, line aggregation, pricing |

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
3. Load the resolved `CalculatorConfig` per `productCode` from `config/` (`merge` BASE_CONFIGS + supplier overrides → `resolve`/`normalise` variables and option lists)
4. Dispatch each run to the calculator from `calculators/registry.ts` (all fence products currently share `quickScreenCalculator`, which branches on `config.strategy.fence`, not on product code)
5. Resolve SKUs + companions from the config/component catalogue; aggregate lines by SKU; tag with `runId`/`segmentId`/`productCode`; split into `runResults[]`
6. Warnings/errors/assumptions collected; **pricing stage last + non-fatal** (missing price → `unitPrice=0` + warning, BOM still returned)
7. Strip `trace`/most of `computed` for non-admin

**Trace gating:** `role === 'admin'` → full `trace[]` + `computed{}`. Non-admin → `trace: []` and only `actual_height_mm` retained in `computed` (needed by `AchievedHeightBadge`).

See [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md) for the full contract.

### get-calculator-config (LIVE)

`POST /functions/v1/get-calculator-config` — accepts `{ productCode?, variables? }`, returns the resolved `UiCalculatorConfig` (fields with concrete `options_json`, `strategy`, `gapRules`, `panelRules`, `gateRules`, height ladder, and `normalisedVariables`). Reads `BASE_CONFIGS` + per-product field files, resolves against the passed variables, and strips authoring-only keys. Consumed by `src/hooks/useCalculatorConfig.ts`; it is the single source of truth for form fields and option lists in the client. `useRunReconciliation` uses its `normalisedVariables` to correct run variables after load — so no client-side per-product normalisation is needed.

### Parked functions

`bom-calculator` (the fully data-driven engine) and `calculate-pricing` are **not called by the client**. Their pipeline specs live in [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/). Do not wire the client to them without a deliberate decision to revive the data-driven approach.

---

## 7. Deferred Features (v2)

**Do NOT build these:**

1. **AI Job Description Parsing** — natural language → fence config via Claude API. Requires `parse-job-description` edge function with `ANTHROPIC_API_KEY`, `useAIParse` hook, `JobDescriptionParser` component.
2. **AI BOM Review** — BOM sanity check via Claude API. Requires `review-bom` edge function, `useAIReview` hook, `BOMReviewer` component.

When v2 is ready, `FenceConfigContext` needs a `SET_CONFIG` bulk-update action for the AI parse result.

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

**v1 Phases 0–7 complete** (Phase 7 included V1 code removal). The live calculator is the static engine; the fully data-driven engine was parked (see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/)). See `docs/tasks.md` for current status.

---

## 11a. Add a fence family (static engine)

Adding a fence system (e.g. HSSG, QSGH, a patio-as-fence) touches these registration points — it is **not** "one JSON seed file" (that was the parked data-driven plan). Reference: [`docs/configurable-static-calculator-plan.md`](docs/configurable-static-calculator-plan.md).

**Edge (the calculation):**
1. `supabase/functions/bom-calculator-static/config/products/<code>/fields.json` — field + option definitions (copy an existing family as the template).
2. `config/base.ts` — register the field file in `PRODUCT_FIELD_FILES`, add a `BASE_<CODE>_CONFIG` (defaults, `strategy`, panel/gate rules, display), and add it to `BASE_CONFIGS`.
3. `calculators/registry.ts` — map the `productCode` to a calculator. Reuse `quickScreenCalculator` if `strategy.fence` fits (horizontal/vertical slat or panel); otherwise add a new calculator file.
4. `engine.ts` — extend the max-panel-width map and tag any new `COMPONENTS` rows with the new `system_types`.
5. `supabase/functions/_shared/types.ts` — add the code to the `SystemType` union.

**Client (display only — no calculation logic):** the calculator UI is product-agnostic (it renders the resolved config). The only per-product client touchpoints are the **label maps**: `src/lib/displayNames.ts`, `systemDisplay.ts`, `constants.ts`, `slugLabels.ts`, `installVideos.ts`. (`src/lib/productOptionRules.ts` still holds a legacy per-product normaliser core being retired — do not extend it.)

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

**Engine tests:** Deno unit tests for the live static engine live under `supabase/functions/bom-calculator-static/` (`engine_test.ts` with snapshot fixtures under `__snapshots__/`, and `config/resolve_test.ts` for config resolution). Run with `deno test`.

**Client tests:** Vitest unit tests colocated with source (`*.test.ts`/`*.test.tsx`). Run with `npm run test`.

Cypress E2E coverage is a follow-up phase. `SchemaDrivenForm` emits `data-testid={field_key}` so future selectors can be written against the `/fence-calculator` route.

> The Deno tests for the parked `bom-calculator` function (`index_test.ts`, TC-V3-1…8) belong to the data-driven engine — see [`docs/_deprecated/data-driven-approach/`](docs/_deprecated/data-driven-approach/).

---

## 15. Notes for Claude Code

- **Never put pricing numbers, margin percentages, or wholesale costs in client-side code.** Use obviously fake values (e.g. $1.00) with a `// TODO: real pricing in edge function` comment if needed during development.
- **The canvas is a vanilla JS port, not a rewrite.** `canvasEngine.ts` is pure TypeScript — no React, no JSX, no hooks. Do not refactor it using react-konva or any React canvas library.
- **Australian context**: Currency is AUD, GST is 10%, measurements are metric (mm for heights/widths, m for run lengths). Postcodes are 4 digits.
- **Colour names are Colorbond brand names** — spelled exactly as listed in Section 4. The engine normalises long names to short codes (`black-satin` → `B`); on the client, `useCalculatorConfig`'s `normalisedVariables` carries the resolved short codes.
- **Multi-tenancy: every table has `org_id`.** Edge functions always scope queries by `org_id` resolved from the user's JWT. RLS policies use `public.user_org_id()`. The client never sends `org_id`.
- **Always update `docs/tasks.md` after completing any task or group of tasks.** Tick off `[x]`, update the Phases Overview table, and update the "Current Phase" header. Do this before responding to the user.
- **The live calculator is the static engine, not the DB-driven one.** To change calculation behaviour, edit the config under `supabase/functions/bom-calculator-static/config/` (see § 5a). Do **not** edit the parked `supabase/functions/bom-calculator/index.ts` or seed the `product_rules`/`product_variables`/etc. tables — the live path does not read them. The `supabase/seeds/glass-outlet/products/*.json` files and the `seed-mapper` skill feed the parked data-driven engine.
- **Client code must not branch on product code.** Fetch the resolved `UiCalculatorConfig` via `useCalculatorConfig` and read `strategy.fence`, `gapRules`, `panelRules`, `gateRules`, and resolved field `options_json`; let `useRunReconciliation` snap run variables to `config.normalisedVariables`. `src/lib/productOptionRules.ts` is a **legacy module being retired** — do not add call sites. (`clampPostSpacing` was extracted to `src/lib/postSpacing.ts`.)
- **Products table is flat** (post migration 022). No parent/variant hierarchy — every product has `parent_id = NULL`. The `product_type` column distinguishes fences from gates from other catalog items. Don't reintroduce a `WHERE parent_id IS NULL` filter.
- **Admin trace access** requires `profiles.role = 'admin'`. The seeded `admin@glass-outlet.com` / `123456` user has it. New admins: `UPDATE profiles SET role = 'admin' WHERE email = ...`.
- **Legacy routes are gone.** `/new` (v1 `MainApp` + `calculate-bom`) and `/fence-calculator-v4` (`CalculatorV4Page` + `CalculatorContextV4` + `calculator-v4/`) have been removed. The only calculator route is `/fence-calculator` (`CalculatorV3Page`), backed by `bom-calculator-static` + `get-calculator-config`.
- **Canonical payload** is the single JSON shape shared by canvas, form, engine, and `quote_runs`/`quote_run_segments`. `runId` and `segmentId` are stable across round-trips. Do not regenerate them in adapter code — that breaks load/save. See `docs/canonical-payload.md`.

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
| `npm run db:reset` | Reset DB to a clean seeded state |
| `supabase start` | Start the local Supabase backend |
| `supabase stop` | Stop the local Supabase backend |
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
