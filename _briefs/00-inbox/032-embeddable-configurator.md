# 032 — Embeddable configurator (iframe embed route + loader script + postMessage API)

Branch: `codex/brief-032-embeddable-configurator`
Target: PR base branch is `staging` (salvage workflow — `master` stays frozen until Phase E is proven on staging). Confirm before submitting.

**Depends on**: Salvage Phases A–D merged (the multi-supplier org/RLS model from Phase A is the foundation for the embed's anon-access scoping). Phases A & B are merged to `staging`; C is merged; D groundwork is in PR #102.

**Anon-access design — reuse the Phase A RLS matrix.** The "sharp edge" (D.2 / risk note) is anon read access scoped to `embed_enabled` orgs. Build on `supabase/tests/rls_matrix_test.ts` from Phase A: EXTEND it with embed cases — assert that anon can read ONLY embed-enabled orgs' calculator-render data (`product_variables`, `product_component_selectors`, `products`, `colour_options`, `system_instances`) and NOTHING from embed-disabled orgs, and still NO pricing/SKU/`product_components`/`pricing_rules` for anyone. That test is the line-by-line RLS review the risk note asks for.

Use npm 10.x if package-lock.json needs touching.

## Goal

Turn QuickScreen from a standalone site into an embeddable product. A supplier's web person should be able to paste a two-line snippet into any page on their site and get the full calculator, themed to their org, with no QuickScreen app chrome. This is the deliverable both pending supplier deals are buying — it outranks everything else in the queue.

Phase 1 is **iframe-only** (simplest, most isolated, no CSS bleed). A native web component can be a later brief if a supplier demands it; do not build it now.

## What to implement

### A. Embed route — chromeless calculator

1. Add route `/embed/:orgSlug` rendering `CalculatorV4Page` with:
   - NO app navigation, NO login UI, NO footer — calculator only.
   - Org theme applied from the existing `org_calculator_theme` data (migration 027). Resolve org by slug; if the org has no slug column yet, add `slug TEXT UNIQUE` to `organisations` in a new migration (`031_add_org_slug.sql` or next free number).
   - A small, fixed "Powered by Skybrook" attribution element (bottom-right, text-xs, links to skybrook.com.au, `rel="noopener"` target `_blank`). This is non-negotiable product strategy — do not make it a theme option.
2. The embed route must not require authentication. Audit what the calculator reads anonymously: `product_variables` already has authenticated SELECT per migration 012 — this needs an anon-readable path. Options, in order of preference:
   - Add anon SELECT RLS policies scoped to rows belonging to orgs where `embed_enabled = true` (new boolean column on `organisations`, default false), OR
   - Route all embed reads through the `bom-calculator` edge function with the service role, keyed by a per-org public embed key (see D).
   Pick one, document the decision in the PR body, and do NOT weaken RLS for non-embed orgs.
3. Quote creation from the embed route works without login: quotes save against the org with a `source = 'embed'` column value (add to quotes table if absent) and capture customer contact fields (name, email, phone) — this is the supplier's lead, and it must land in their quote history.

### B. Loader script + snippet

4. Create `public/embed.js` (plain JS, no bundler dependencies, < 5 KB) that:
   - Finds its own `<script>` tag, reads `data-org` and optional `data-height-mode` attributes.
   - Injects an `<iframe>` pointing at `{APP_ORIGIN}/embed/{org}` with sensible defaults: `width: 100%`, initial height 700px, no border, `allow="geolocation"` (the layout map may want it), `loading="lazy"`, `title="Quote calculator"`.
   - Listens for `message` events from the iframe origin and auto-resizes the iframe height on `quickscreen:resize` events.
   The customer-facing snippet becomes:
   ```html
   <script src="https://app.skybrook.com.au/embed.js" data-org="glass-outlet" defer></script>
   ```
5. APP_ORIGIN must not be hardcoded — derive from the script's own `src`.

### C. postMessage API (iframe → parent)

6. From the embed route, post the following events to `window.parent` (always check `window.parent !== window` first):
   - `{ type: 'quickscreen:ready' }` on mount
   - `{ type: 'quickscreen:resize', height: <px> }` on content height change (use a `ResizeObserver` on the app root)
   - `{ type: 'quickscreen:quote-created', quoteId, totalIncGst, productCount }` after successful quote save — totals only, never line-item pricing, never trade pricing
7. Use `targetOrigin = '*'` for resize/ready (no sensitive payload) but document in code comments why quote-created should move to a per-org configured origin once `embed_domains` exists (see D.9).

### D. Security and abuse limits

8. New migration: `organisations.embed_enabled BOOLEAN NOT NULL DEFAULT false` and `organisations.embed_domains TEXT[]` (allowed referrer domains).
9. The embed route checks `document.referrer` against `embed_domains` when the list is non-empty; on mismatch render a polite "This calculator isn't enabled for this site" panel instead of the app. (Referrer checks are advisory, not security — the real gate is RLS/edge-function scoping from A.2. Say so in a comment.)
10. README: add a section documenting that each embedding supplier's domains must be added to the Google Maps API key HTTP-referrer allowlist, alongside the existing Netlify/localhost referrers. Missing this will break the layout map on the supplier's site and it WILL be the first support call.
11. Confirm Netlify/headers allow framing of `/embed/*` by third-party origins (no blanket `X-Frame-Options: DENY` / `frame-ancestors 'none'` on that path) while KEEPING anti-framing protection on the admin and main app routes. Add a `netlify.toml` headers stanza per-path as needed.

### E. Internal demo page

12. Add `public/embed-demo.html` — a fake "supplier website" (plain HTML, lorem ipsum, a hero image placeholder) with the snippet from B.4 dropped in, used for Cypress tests and sales demos. This page is the screenshot that closes deals; make it look like a believable supplier site, not a test rig.

## Constraints

- DO NOT modify `canonicalAdapter.ts` public function signatures.
- DO NOT modify `canvasEngine.ts` public types.
- DO NOT touch `package.json` beyond strictly necessary (embed.js is dependency-free plain JS).
- No new npm dependencies for the loader script.
- Skip the Deno integration job (pre-existing red, out of scope).
- Run `npm run typecheck`, `npm run test`, `npm run build` before opening the PR.

## Manual reproduction / How to verify

1. `npm run dev`, open `http://localhost:5173/embed/glass-outlet` — calculator renders, org-themed, no nav, no login prompt, Powered-by badge visible.
2. Serve `public/embed-demo.html` (e.g. `npx serve public -p 3125`), open it — iframe loads, resizes as you add runs/gates (no inner scrollbar), parent console logs `quickscreen:ready` and `quickscreen:resize` events.
3. Build a quote to completion inside the embed — `quickscreen:quote-created` fires with totals only; quote appears in the org's admin quote history with `source = embed`.
4. Set `embed_enabled = false` for the org → embed route renders the disabled panel.
5. Confirm `/admin` still cannot be iframed (headers check).

## Risk assessment

- **RLS changes are the sharp edge.** Anon read paths must be scoped to embed-enabled orgs only; a sloppy policy here exposes every org's catalogue. Review the policy SQL line-by-line in PR review.
- Medium blast radius on routing (`App.tsx`) — coordinate with in-flight UI briefs.
- No changes to BOM math, engine, or pricing logic. Calculator behaviour inside the iframe must be pixel-identical to the standalone v4 page.
