# Project status & onboarding — for Kito

*Written 14 June 2026. Read this top-to-bottom before touching code. It assumes you
know nothing about what's been done here or why — by the end you'll know exactly
where the project stands, what was built, what broke, and what's left.*

Companion docs already in the repo (read in this order if you want the full story):
1. **`AGENTS.md`** / `CLAUDE.md` — the architecture bible (business rules, DB design, engine, security checklist). Authoritative.
2. **`HANDOVER.md`** — business context: who Liam is, the three-phase Skybrook plan, what's in/out of scope.
3. **`SALVAGE-PLAN.md`** — the exact plan for Phases A–E (the "port the good parts of the fork" project). This doc summarises its outcome.
4. This file — the current snapshot.

---

## 1. What the product is (30-second version)

**QuickScreen** is a Bill of Materials (BOM) generator for aluminium slat fencing/screening + gates, built for **The Glass Outlet** and white-labelled under **Skybrook**. A user draws/configures a fence, picks options, and gets a fully-priced BOM (every post, rail, slat, bracket, screw) they can export.

**The business goal right now (Phase 1 only):** sell an **embeddable** version of this calculator to building-product suppliers. A supplier pastes one `<script>` tag on their website and gets their own themed calculator. Two deals are waiting on this: **The Glass Outlet** and **Amazing Fencing**. That embed is the deliverable everything else serves. (Phases 2 and 3 — cross-supplier pricing DB, consumer marketplace — are explicitly **out of scope**; don't build toward them.)

## 2. The two key architecture facts you must internalise

These two ideas explain ~90% of the codebase decisions:

1. **The rules engine is DATA, not CODE.** BOM math, pricing, validations, which components get added — all of it lives in **seeded Postgres tables** (`product_rules`, `product_constraints`, `product_variables`, `product_validations`, `product_component_selectors`, `product_companion_rules`, etc.), authored as **per-product JSON files** under `supabase/seeds/glass-outlet/products/*.json`. Adding a new fence system or onboarding a new supplier = **new data rows, NOT new code branches**. The edge function `supabase/functions/bom-calculator-static/` is product-agnostic — do not hardcode product logic into it. To change calculation behaviour, edit the JSON seed and run `npm run db:reset` (or `npm run seed:products`).

2. **Multi-tenancy is sacred.** Every table has `org_id`. RLS policies scope every read/write to the user's org via `public.user_org_id()`. **One supplier must NEVER see another's catalogue or pricing.** A scoping bug here is, in Liam's words, "business-ending." When in doubt about an RLS change, get it reviewed line-by-line. There is a CI test for exactly this: `supabase/tests/rls_matrix_test.ts` (see §6).

## 3. The stack

React 19 + TypeScript + Vite + Tailwind (dark/light theme) · Supabase (Postgres + RLS + Deno edge functions) · TanStack Query (server state) · React Context + useReducer (client state) · Google Maps JS API (the fence layout drawing tool) · Netlify hosting · Cypress + Vitest + Deno tests.

**Frontend has three calculator generations that coexist:** `src/components/calculator/` (v1, legacy), `calculator-v3/`, and `calculator-v4/`. **v4 is canonical — all new work targets v4.** (v3 is still the *live* route today; see §5 Phase D for why we haven't deleted v3 yet.)

Local setup is in `AGENTS.md §16` and `README.md`. TL;DR: `npm install`, fill `.env.local`, `npm run setup` (starts Supabase + resets + seeds), `npm run dev`. Test logins: `test@glass-outlet.com` / `123456` (user), `admin@glass-outlet.com` / `123456` (admin — needed for the trace panel).

---

## 4. Where this came from — the "salvage" backstory

There were **two repos**:
- **MAIN** (this one, `skybrook-tech/quickscreen-bom-generator`) — the disciplined repo, briefs through 031.
- **FORK** (`skybrookai-atlas/quickscreen-colorbond-bom-generator`) — an exploratory sprint that ran way ahead (briefs through 046, migrations through 065) and built a lot of good stuff *plus* a lot of out-of-scope Phase 2/3 marketplace/AI work.

Liam's call: **stay in Phase 1.** So we ran a **salvage**: port the genuinely good pieces of the fork into MAIN, leave the marketplace/AI/portal stuff behind (the "kill list" in `SALVAGE-PLAN.md`). That salvage is Phases A–E below. **If you ever find yourself porting something from the fork, check the kill list in `SALVAGE-PLAN.md` first — those omissions are deliberate product decisions, not oversights.**

---

## 5. Phase-by-phase: what was done, status, and what went wrong

> **Branching/PR convention:** work happens on `codex/*` branches → **draft PR against `staging`** (NOT master — master is frozen until the embed is proven on staging) → a human merges. Never auto-merge. A separate **staging environment** (its own Supabase project + Netlify site, auto-deploys on merge to `staging`) exists so we can prove the embed before touching production.

### Phase A — Data architecture: suppliers, archetypes/instances, versioned price books ✅ MERGED (PR #96)
The crown jewel of the fork. Ported the supplier/instance model + **versioned price books** (so old quotes stay pinned to the price they were quoted at while new ones use the latest). Renumbered the fork's migrations sequentially onto MAIN's numbering.

**What went wrong / was hard:**
- The fork's **RLS history was a mess** — it had churned through multiple access-control migrations ending in a blanket `GRANT SELECT ... TO anon` (which would have exposed every org's catalogue). We did **NOT** port those. Instead we wrote **one deliberate RLS migration** (org-scoped authenticated reads, **no anon grants at all** in this phase) and built the **RLS matrix test** (`supabase/tests/rls_matrix_test.ts`) to lock the access model down in CI. This test is now load-bearing — keep it green.
- A follow-up commit (`648d722`) was needed to address code-review security hardening + add a **production-DB guard** to the seed/RLS scripts (so you can't accidentally nuke prod data).

### Phase B — Import pipeline + multi-supplier admin CRUD ✅ MERGED (PR #98)
The "onboarding machine": a Cin7/CSV import parser + diff engine, and admin pages to manage suppliers, system instances, products, and run imports. Routes live under `/admin/*` behind `AdminGuard`. `seed-products.js` now walks per-supplier seed directories.

### Phase C — Supplier #2 and #3 data: Amazing Fencing + Discount Fencing ✅ MERGED (PR #100)
Seeded two more supplier orgs as **isolated** orgs/suppliers (JSON-authoritative seeds), squashing the fork's trial-and-error migration churn into clean minimal seeds. Added `useBranding` groundwork + the Amazing Fencing logo (white-label prep that directly serves the embed). Raw price-list xlsx files were **deliberately kept out of git** (Liam holds them locally) — only the extracted data went into seeds.

**Open follow-up:** **issue #101** — the AF/DF BOM calculations have NOT been verified against a known-correct example yet. **Do not put those calculators in front of those customers until a real fence spec + expected material list is pinned as a regression test.** This is a real risk: a wrong BOM costs a tradesperson real money.

### Phase D — v4 consolidation ⚠️ PARTIALLY DONE / DEFERRED (PR #102 = groundwork; issue #103 = the rest)
The plan was: make v4 canonical, **delete v1 (`calculator/`) and v3 (`calculator-v3/`)**, and settle on one BOM calculation path.

**What went wrong (important):** recon found **v4 is NOT yet a superset of v3.** v4 is missing: quote save/load, PDF/CSV/print export, the property map, the describe-fence parser, the gate modal, customer mode, and the mobile shell. So deleting v3 right now would lose working features. **The deletion is therefore DEFERRED** (tracked in **issue #103**) and is a multi-day feature-port job, not a quick cleanup. **v3 remains the live calculator at `/fence-calculator` today.** v4 is at `/fence-calculator-v4`.

**One thing that WAS resolved:** the "which calculator path" question. There is **one BOM source of truth** — the edge function `bom-calculator-static`. The old `localBomCalculator.ts` "protected file" turned out to be a phantom (not actually used); the protected-files note about it is obsolete.

### Phase E — Hand back to the plan + build the embed (brief 032) 🚧 IN PROGRESS (this branch: `codex/salvage-phase-e`)
This is the current work and where the live edge is. **Brief 032 = the embeddable calculator** — the actual deal-closing deliverable. The brief itself is `_briefs/00-inbox/032-embeddable-configurator.md` (read it; it's the spec).

What's been built so far on this branch (in commit order):
1. **Schema layer** (`migrations/040_embed_schema.sql`) — `organisations.embed_enabled` (opt-in flag, default false), `organisations.embed_domains` (advisory referrer allowlist), `quotes.source` ('app' vs 'embed'), and `quotes.user_id` made nullable (an embed quote has no logged-in user). A CHECK constraint enforces "embed ⇒ no user / app ⇒ has user".
2. **Anon RLS — THE SHARP EDGE** (`migrations/041_embed_rls.sql`) — grants the `anon` role SELECT on EXACTLY four things, each gated to `embed_enabled` orgs only: `products`, `product_variables`, `colour_options`, and four safe columns of `organisations` (id/slug/name/branding/embed_domains). **Everything sensitive stays anon-denied** (pricing, components, engine rules, selectors, quotes — all REVOKE'd defensively). The RLS matrix test was extended with embed cases to prove anon reads ONLY embed-enabled orgs' safe metadata and nothing else.
3. **Loader + demo + headers** — `public/embed.js` (dependency-free <5KB script that injects an auto-resizing iframe), `public/embed-demo.html` (a fake supplier site for demos/tests), and per-path frame headers in `netlify.toml` (embed is framable by third parties; admin/app routes are NOT).
4. **The route itself** — see §7 for the full architecture. This is the chromeless `/embed/:orgSlug` page + anonymous BOM calc + anonymous quote capture + the postMessage bridge.
5. **Rate limiting** (`migrations/042_embed_rate_limits.sql`) — the anon endpoints are now throttled per-(org, client IP): `embed-quote` at 5/min, the anon BOM calc at 30/min, returning HTTP 429 over the limit. Postgres-backed counter (`embed_rate_limits` table + an atomic `embed_rate_limit_hit()` function), service-role only. The limiter **fails open** (a DB blip allows the request rather than taking the embed down). See `supabase/functions/_shared/rateLimit.ts`.

---

## 6. The RLS matrix test — your safety net

`supabase/tests/rls_matrix_test.ts` runs against a live seeded DB and asserts, for each role (anon / org-A user / org-B user / admin), exactly what is readable across the catalogue + pricing + embed surface. It provisions a second org, runs the matrix, and cleans up. **It has a production-DB guard** (refuses to run against the known prod project ref unless `ALLOW_PROD_DB=1`). It runs in CI's Deno job.

⚠️ **The Deno integration CI job is pre-existing RED and is being skipped** (documented in the brief/handover as out of scope). Don't be alarmed by it; just don't let *new* failures hide in it. Run the RLS matrix locally when you touch any RLS.

**If you change ANY RLS policy or anon grant, update and re-run this test.** It is the single thing standing between us and a cross-supplier data leak.

---

## 7. The embed architecture (what the most recent commit added)

This is the part you'll most likely touch next, so here's the full map.

**Route:** `/embed/:orgSlug` in `src/App.tsx` — **no `AuthGuard`** (it's anonymous, framed into supplier sites).

**`src/pages/EmbedCalculatorPage.tsx`** — resolves the org by slug (`useEmbedOrg`), and renders one of: a loading panel, a "not available" panel (org missing or `embed_enabled=false` — anon RLS hides both identically), a "not enabled for this site" panel (advisory `embed_domains` referrer mismatch), or the calculator. Wraps the calculator in `EmbedProvider`.

**`src/context/EmbedContext.tsx`** — carries the resolved `orgId`/`orgSlug`. **This is the multi-tenant guardrail for the embed.** Because the anon RLS policy exposes *every* embed-enabled org's rows, a bare anon query would mix two suppliers' data. So the data hooks read `orgId` from this context and add an explicit `.eq('org_id', orgId)` filter. The hooks changed for this: `useProducts`, `useColourOptions`, `useProductVariables` (org-filtered), `useProductSearch` (disabled on embed — never expose SKU/pricing), `useQuotes` (list query disabled on embed).

**`src/pages/CalculatorV4Page.tsx`** — now takes an optional `embed` prop. In embed mode it: renders **chromeless** (no `AppShell` header/nav), themes from the org's branding instead of the logged-in profile, uses a **flow layout** (drops the viewport-height caps so the iframe can auto-resize), shows the fixed **"Powered by Skybrook"** badge (`src/components/embed/PoweredBySkybrook.tsx` — this is non-negotiable product strategy, NOT a theme option, do not make it removable), and wires the postMessage bridge + the embed save path.

**Anonymous BOM calc:** `supabase/functions/_shared/auth.ts` gained `resolveEmbedOrg(slug)` (looks up the org, requires `embed_enabled=true`, forces retail `tier1` pricing — trade tiers are NEVER exposed anonymously). `bom-calculator-static/index.ts` branches: if the request carries `embedOrgSlug` it uses that path, otherwise the normal JWT-profile path. `src/hooks/useBomCalculator.ts` has an embed mode that skips the "must be logged in" check.

**Anonymous quote capture:** anon has no insert access to `quotes`, so quotes are created server-side by a new service-role edge function **`supabase/functions/embed-quote/index.ts`** (writes `source='embed'`, `user_id=NULL`, the org_id, captured contact, and the canonical payload in `notes`). `src/hooks/useEmbedQuote.ts` calls it. The quote lands in that org's admin quote history — that's the supplier's lead.

**postMessage bridge:** `src/hooks/useEmbedBridge.ts` posts to the parent window: `quickscreen:ready` (on mount), `quickscreen:resize` (ResizeObserver on the app root — drives the iframe auto-resize), and `quickscreen:quote-created` (after a save — **totals only, never line items or trade pricing**). `embed.js` re-dispatches these as `CustomEvent`s on the host page so suppliers can hook analytics.

**Abuse limits:** the two anon endpoints (`embed-quote`, and the `embedOrgSlug` branch of `bom-calculator-static`) are rate-limited per-(org, client IP) via a Postgres counter — `supabase/functions/_shared/rateLimit.ts` calls the `embed_rate_limit_hit()` function from migration 042. Quotes 5/min, BOM 30/min, over-limit → 429 (`useEmbedQuote` shows a friendly "slow down" toast). The limiter fails open. Authenticated app traffic is never limited by this.

**Misc this commit touched:** added a `phone` field to v4 quote details (lead capture); deploy workflows now deploy `bom-calculator-static` + `embed-quote` (the former was missing from the deploy list — a pre-existing gap that would've broken the calculator on a fresh staging deploy); README documents the Google Maps referrer-allowlist requirement (see §8).

**Status:** `npm run typecheck`, `npm run test`, `npm run build` all green. Committed to `codex/salvage-phase-e`. **Not yet PR'd, not yet manually verified in a browser** (see §8).

---

## 8. What's left to do (your TODO list, roughly prioritised)

**To finish brief 032 (the embed):**
1. **Manual browser verification** — nobody has actually clicked through it yet. Run `npm run dev`, open `/embed/glass-outlet`: confirm it renders themed, chromeless, no login, badge visible. Then serve `public/embed-demo.html` (e.g. `npx serve public -p 3125`) and confirm the iframe loads, **auto-resizes** as you add runs/gates (no inner scrollbar), and the parent console logs `quickscreen:ready` / `quickscreen:resize`. Build a quote and confirm `quickscreen:quote-created` fires and the quote shows in the org's admin quote history with `source='embed'`. Then flip `embed_enabled=false` and confirm the disabled panel. Confirm `/admin` still cannot be iframed.
   - ⚠️ The iframe **auto-resize is the most likely thing to need tuning** — the v4 layout was designed around a fixed viewport with inner scroll; I converted it to a flow layout for embed, but it hasn't been watched resize for real. Check for resize feedback loops or a too-tall/too-short iframe.
2. **You MUST add each embedding supplier's domain to the Google Maps API key's HTTP-referrer allowlist** (Google Cloud Console), or the layout map silently dies on their site. This will be the first support call if missed. Documented in `README.md`. Also add their domains to `organisations.embed_domains`.
3. **Cypress E2E for the embed** — deferred by the brief to a follow-up phase; `embed-demo.html` exists to test against. The v4 form emits `data-testid` attributes for selectors.
4. **Open the draft PR against `staging`** (not master), document the anon-access decision in the PR body, and get the RLS reviewed line-by-line.

✅ *Rate limiting on the anon endpoints is DONE (migration 042) — see §7. The limits (5/min quotes, 30/min BOM) are conservative starting points; tune them once you see real embed traffic.*

**Bigger deferred items (tracked as issues):**
- **issue #101** — verify Amazing Fencing / Discount Fencing BOM math against a known example before those calculators go live. **Blocker for deal #2.**
- **issue #103** — the real v3→v4 consolidation: port v4's missing features (quote save/load, PDF/CSV/print, property map, describe parser, gate modal, customer mode, mobile shell), then delete v1 + v3. Multi-day. Until then v3 stays the live route.

**Production hardening (P3, before any big go-live):** error monitoring (Sentry free tier), backup/restore verification, and a load test of the embed route at a few hundred concurrent sessions. (Anon rate limiting is already in — see §7; the *authenticated* BOM function is still unthrottled if you want belt-and-suspenders there too.)

---

## 9. Things that will bite you if you don't know them

- **`npm run test` only runs a single test file** (`useGoogleMaps.test.tsx`) — that's how the script is configured in `package.json`, not a mistake on your part. The real test coverage is Cypress (`npm run cy:open`) + the Deno tests.
- **The build emits a "chunk larger than 500kB" warning** — known/expected, not your change.
- **PowerShell on Windows wraps native stderr weirdly** — you'll see `NativeCommandError` noise around `npm`/`git` output even on success. Check the actual exit/result, not the red text.
- **`master` is frozen.** PRs go to `staging`. Don't push to master.
- **Don't commit** the raw price-list xlsx files, `HANDOVER.md`/`SALVAGE-PLAN.md` planning docs are intentionally untracked, and never put real pricing/margins in client code (use obviously-fake values with a TODO).
- **Colour names are exact Colorbond brand strings** (e.g. `black-satin`) — the engine maps them to short codes server-side. Don't "tidy" them.
- **`org_calculator_theme` vs `organisations.branding`:** the brief mentions a migration-027 theme table, but the code actually reads the theme from `organisations.branding` (JSONB). Trust the code (`ProfileContext`, `useEmbedOrg`).

---

## 10. Quick file map for the embed work

```
src/App.tsx                                   route: /embed/:orgSlug (no auth)
src/pages/EmbedCalculatorPage.tsx             org resolve + state panels + provider
src/pages/CalculatorV4Page.tsx                now embed-aware (chromeless + flow layout)
src/context/EmbedContext.tsx                  orgId guardrail for anon queries
src/hooks/useEmbedOrg.ts                       resolve org by slug (anon)
src/hooks/useEmbedBridge.ts                    postMessage ready/resize/quote-created
src/hooks/useEmbedQuote.ts                     anon quote creation (calls edge fn)
src/components/embed/PoweredBySkybrook.tsx     mandatory attribution badge
src/components/embed/EmbedMessage.tsx          loading / disabled panels
public/embed.js                                the loader supplier paste onto their site
public/embed-demo.html                         fake supplier site for demos/tests
supabase/migrations/040_embed_schema.sql       columns
supabase/migrations/041_embed_rls.sql          anon RLS (THE SHARP EDGE — review carefully)
supabase/migrations/042_embed_rate_limits.sql  rate-limit table + atomic counter fn
supabase/functions/_shared/auth.ts             resolveEmbedOrg()
supabase/functions/_shared/rateLimit.ts        enforceEmbedRateLimit()
supabase/functions/bom-calculator-static/      embedOrgSlug branch + rate limit
supabase/functions/embed-quote/                anon lead-capture quote (service role) + rate limit
supabase/tests/rls_matrix_test.ts              the access-control safety net
```

Welcome aboard. When in doubt, ask Liam about the *business* rule and the coder partner about the *code* — and never assume an RLS or BOM-math change is "obviously fine."
