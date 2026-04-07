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

> **Deferred to v2**: AI job description parsing (natural language → form fill) and AI BOM review (Claude sanity check on generated BOM). Do NOT build these in v1.

### Current State

**Phases 0–6 are complete. Phase 7 (Polish) is in progress.** The React app is the primary codebase.

- The original monolithic HTML file (`index.html`) still exists as the **functional specification** — every form field, dropdown, and validation rule must exist in the React version
- See `docs/tasks.md` for the full current task status

### Current Architecture

- **React + Vite** SPA with **Tailwind CSS** (dark theme)
- **Supabase** backend: Auth, Postgres DB, Edge Functions
- **TanStack Query** for server state management
- **React Context + useReducer** for client state (fence config, gate list, UI state)
- **All pricing and BOM calculation logic in Supabase Edge Functions** (IP protection)

---

## 2. Tech Stack

| Layer          | Technology                                 | Purpose                                                  |
| -------------- | ------------------------------------------ | -------------------------------------------------------- |
| Framework      | React 19 with Vite                         | SPA build tooling, HMR, fast dev                         |
| Styling        | Tailwind CSS 3                             | Utility-first CSS, dark UI theme                         |
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

Source lives in `src/` with these top-level directories: `components/` (auth, bom, canvas, contact, fence, gate, layout, quote, shared, wizard), `context/`, `hooks/`, `lib/`, `pages/`, `schemas/`, `types/`, `utils/`.

Edge functions are in `supabase/functions/` (calculate-bom, calculate-pricing, \_shared).
Database migrations are in `supabase/migrations/` (001–007).

Run `ls src/` or `ls src/components/` for the current file list — the directory has evolved from the original plan with additional files (wizard components, ThemeContext, QuotesHistoryPage, GateModal, etc.).

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

Every table includes `org_id`. RLS policies use `auth.user_org_id()` (a `SECURITY DEFINER STABLE` function on profiles) to scope all access. Never trust client-sent `org_id` — always resolve from the authenticated user's JWT.

| Migration | Table / View                | Key design notes                                                                                                                                    |
| --------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001       | `organisations`             | Seeds Glass Outlet org (`slug = 'glass-outlet'`). No RLS.                                                                                           |
| 002       | `profiles`                  | `auth.user_org_id()` helper; signup trigger defaults new users to Glass Outlet org.                                                                  |
| 003       | `quotes`                    | RLS: users see **all org quotes** (staff visibility), but can only insert/update/delete their own.                                                   |
| 004       | `product_pricing` _(legacy)_| Renamed to `pricing_rules` in migration 008. Do not reference directly.                                                                             |
| 005       | `products`                  | **No RLS**. Root products + variants via `parent_id` FK. `UNIQUE(org_id, system_type) WHERE parent_id IS NULL`. `UNIQUE(parent_id, system_type) WHERE parent_id IS NOT NULL`. |
| 006       | `product_components`        | **No RLS**. Single source of truth per SKU: name, description, category, unit, default_price, system_types[], active. SKU unique per org.            |
| 007       | _(seed)_                    | Seed now populates `products`, `product_components`, and `pricing_rules` in new format.                                                              |
| 008       | `pricing_rules`             | **No RLS**. Rule-based pricing: `component_id` FK, `tier_code` (tier1/2/3), `rule` (math.js expression, NULL = always), `price`, `priority`.        |
| 008       | `pricing_rules_with_sku`    | View joining `pricing_rules` + `product_components`. Used by edge functions for sku-based lookups. No RLS (service role only).                       |

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

### calculate-bom — Core IP

`POST /functions/v1/calculate-bom` — accepts `{ fenceConfig, gates, layoutSegments? }`, returns `{ fenceItems, gateItems, total, gst, grandTotal, pricingTier, generatedAt }`.

**BOM algorithm (business rules)**:

1. **Panel layout**: Distribute total run evenly into panels ≤ maxPanelWidth. Example: 10m with 2600mm max → 4 panels of 2500mm. NOT max panels + one short remainder.
2. **Post count**: `panels + 1` for a straight run with two post terminations. Subtract 1 per wall-terminated end (F-section used instead). Add 1 per 90° corner. Gate posts are additional to fence posts.
3. **Slat count**: `floor((targetHeight - topGap - bottomGap) / (slatHeight + slatGap))` slats per panel. Total = slats_per_panel × panels. Calculate lengths from 5800mm stock, accounting for offcuts/waste.
4. **Rail count**: 2 per panel (top + bottom), cut to panel width, from 5800mm stock.
5. **Brackets/fixings**: 2 post brackets per post (top + bottom). End caps, screws, rivets per system type.
6. **System-specific rules**:
   - **QSHS**: Horizontal slats, inserted into slotted posts.
   - **VS**: Vertical slats, inserted into top and bottom rails.
   - **XPL**: 65mm only (forced). Slats clip into rails. Different bracket/fixing requirements.
   - **BAYG**: Spacers are separate line items. Customer assembles themselves.
7. **Gate BOM** (separate from fence items): frame, slats (65mm for swing, 65/90 for sliding), gate posts, hinges (2 for single-swing, 4 for double-swing), latches, drop bolts (double-swing), guide rollers + track (sliding).

### calculate-pricing

`POST /functions/v1/calculate-pricing` — accepts `{ bomItems, pricingTier }`, returns priced items. Reads `pricing_rules_with_sku` view via service role key scoped by `org_id`. Evaluates `rule` expressions (math.js, variable: `qty`) to resolve the applicable price per line item. All prices ex-GST; GST is 10% (Australian).

> Kept separate from calculate-bom so BOM can be generated once and repriced across tiers without re-running the material calculation.

---

## 7. Deferred Features (v2)

**Do NOT build these in v1:**

1. **AI Job Description Parsing** — natural language → fence config via Claude API. Requires `parse-job-description` edge function with `ANTHROPIC_API_KEY`, `useAIParse` hook, `JobDescriptionParser` component.
2. **AI BOM Review** — BOM sanity check via Claude API. Requires `review-bom` edge function, `useAIReview` hook, `BOMReviewer` component.

When v2 is ready, `FenceConfigContext` needs a `SET_CONFIG` bulk-update action for the AI parse result.

---

## 8. Canvas Layout Tool

The canvas tool is **a vanilla JS port, not a rewrite**. All drawing logic lives in `src/components/canvas/canvasEngine.ts` — pure TypeScript with no React imports. The React component (`FenceLayoutCanvas.tsx`) is a thin wrapper: mounts the `<canvas>` element via `useRef`, calls `initCanvasEngine()` in `useEffect`, and bridges toolbar/map control clicks to the engine API.

**React controls**: mounting/unmounting, toolbar button clicks (`engineRef.current?.setTool(...)`), "Use This Layout →" button (`engineRef.current?.getLayout()`), map control inputs.

**Canvas engine controls**: all drawing, mouse/touch events, internal state. Never imports React, never causes re-renders.

**Data flow — "Use This Layout →"**: `getLayout()` returns segments + gates + total length + corner count → dispatches `SET_CONFIG` to `FenceConfigContext` and `SET_GATES` to `GateContext`.

Google Maps JS API loaded via `<script>` tag; the engine handles geocoding, tile fetching, and canvas underlay rendering.

---

## 9. UI & Theme

Dark theme: `brand-bg` (#0f1117), `brand-card` (#1a1d2e), `brand-border` (#2a2d3e), `brand-accent` (#3b82f6). See `tailwind.config.ts` for the full token set.

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
- [ ] **Every RLS policy** scopes by `org_id = auth.user_org_id()` — no cross-org data leakage
- [ ] **Edge functions** resolve `org_id` server-side from the JWT user's profile — never trust client-sent `org_id`
- [ ] **The `auth.user_org_id()` function** is `SECURITY DEFINER` and `STABLE` — verified working
- [ ] **Quote inserts** include the correct `org_id` from the user's profile, not from client input

---

## 11. Development Phases

Phases 0–6 complete. Phase 7 (Polish) in progress. See `docs/tasks.md` for current status and `docs/phase-*.md` for detailed phase specs.

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
| Separate `calculate-bom` and `calculate-pricing`     | Allows re-pricing without recalculating materials. Tier switching is instant on the client if BOM is cached.         |
| Vanilla JS canvas port over react-konva              | The existing canvas tool works. A useRef+useEffect wrapper avoids rewriting ~500 lines and removes a dependency.     |
| Zod schemas shared between client and edge functions | Single source of truth for validation. Schemas are copied into `supabase/functions/_shared/` for Deno compatibility. |
| @react-pdf/renderer over jsPDF                       | JSX-based PDF templates are more maintainable. Matches the React mental model.                                       |
| All pricing server-side                              | Non-negotiable for IP protection. The client never knows wholesale costs or margin formulas.                         |
| Multi-tenant schema now                              | Adding `org_id` columns and RLS policies later requires rewriting every migration and query. Cost now: ~30 min.      |
| `auth.user_org_id()` helper function                 | Centralises the org lookup. Every RLS policy calls this function — if logic changes, update one place.               |

---

## 14. Testing

Primary quality gate: **Cypress E2E** — 23 test cases (TC1–TC19, TC24–TC26) that verify exact BOM line items, accessory quantity formulas, and grand totals across all 3 pricing tiers. Tests run against the React app using `data-testid` attributes.

See `docs/cypress-test-report.md` for the current test status and known issues. Outstanding app behaviour gaps that need investigation before Phase 7 closes:

- **TC7**: Wall termination post count may be incorrect
- **TC13**: XPL product codes — currently using QSHS codes; XPL should have its own SKUs
- **TC15**: BAYG product codes — currently using QSHS codes; BAYG should include spacers as separate line items
- **VS system codes**: Need confirmation against the master price file

---

## 15. Notes for Claude Code

- **Never put pricing numbers, margin percentages, or wholesale costs in client-side code.** Use obviously fake values (e.g. $1.00) with a `// TODO: real pricing in edge function` comment if needed during development.
- **The existing `index.html` is the functional specification.** Every dropdown option, validation rule, and form field in that file must exist in the React version (except the two AI features deferred to v2).
- **The canvas is a vanilla JS port, not a rewrite.** `canvasEngine.ts` is pure TypeScript — no React, no JSX, no hooks. Do not refactor it using react-konva or any React canvas library.
- **Australian context**: Currency is AUD, GST is 10%, measurements are metric (mm for heights/widths, m for run lengths). Postcodes are 4 digits.
- **Colour names are Colorbond brand names** — spelled exactly as listed in Section 4.
- **Multi-tenancy: every table has `org_id`.** Edge functions always scope queries by `org_id` resolved from the user's JWT. RLS policies use `auth.user_org_id()`. The client never sends `org_id`.
- **Always update `docs/tasks.md` after completing any task or group of tasks.** Tick off `[x]`, update the Phases Overview table, and update the "Current Phase" header. Do this before responding to the user.
- **Current status**: Phases 0–6 complete. Phase 7 (Polish) is in progress — see `docs/tasks.md` for the remaining checklist items.
