# Fence calculator architecture: tradeoffs (single engine vs client/dual path)

> **Purpose:** Decision record comparing **Approach A — data-driven server engine** (`bom-calculator` + Postgres seeds) vs **Approach B — client-side / dual-path** calculators (exemplar: branch `codex/qshs-calculator-sandbox`). Use when deciding production strategy, public demos, multi-product expansion, multi-tenant clients, security, and AI-assisted development.
>
> **Related:** [`seed-data-mapping-spec.md`](./seed-data-mapping-spec.md), [`bom-calculator-pipeline.md`](./bom-calculator-pipeline.md), [`canonical-payload.md`](./canonical-payload.md), [`CLAUDE.md`](../CLAUDE.md).

---

## 1. Definitions

### Approach A — Single engine (data-driven)

- **BOM logic** runs in **`bom-calculator`** (Supabase Edge), driven by **Postgres**: `product_rules`, `product_component_selectors`, `product_companion_rules`, `product_variables`, validations, warnings, **org-scoped** `pricing_rules`.
- **Per-product differences** are mostly **seed JSON** under `supabase/seeds/glass-outlet/products/`, validated and upserted — not separate forks of the engine.
- **Client** builds a **canonical payload** and UI; forms ideally driven by **`product_variables`** (schema-driven calculator UI).

### Approach B — Client / dual path (sandbox-style)

- **Large in-browser BOM implementation** (e.g. `localBomCalculator.ts`) with imperative SKU/qty logic, **plus** optional invocation of the **same** edge function when Supabase is configured and the user has a session.
- **Fallback:** no Supabase / no session / edge error → **local BOM** in the browser.
- **Additional layers:** hardcoded UI option matrices (e.g. `productOptionRules.ts`), bundled seed fragments and synthetic rows (`localSeedData.ts`), optional client-only suggested-accessory logic.

---

## 2. Executive summary

| Criterion | Approach A | Approach B |
|-----------|------------|------------|
| **Single source of truth for quotes** | Strong — one execution pipeline | Weak — two implementations unless local path is explicitly non-authoritative |
| **Adding products** | Mostly **seed data** + engine tests | Mostly **new code branches** + risk of drift from edge/seeds |
| **Multi-client (orgs)** | Natural (`org_id`, JWT-scoped loads) | Local path is effectively **single baked dataset** in the bundle |
| **IP / pricing secrecy** | Strong when logic and tiers stay server-side | **Weak on fallback path** — rules and numbers ship to the browser |
| **Public / unauthenticated demo** | Requires explicit design (estimate API, rate limits, tier scope) | **Built-in** — at the cost above |
| **AI-assisted development risk** | Drift in seeds or **duplicate canonical schema** (client vs `_shared`) | **High** — AI may fix client BOM but not edge seeds (or UI rules vs `product_variables`) |
| **Ops / developer setup** | Supabase, seeds, edge deploy | Lower bar for UI-only work without a running backend |

**Recommendation:** **Approach A** as the **canonical** production path for quotes and BOM. Use **B-like UX** (instant feedback, public access) only with **clear scope**: server-backed estimate, rate limits, and **no full wholesale engine** in the client unless accepting explicit tradeoffs.

---

## 3. Adding products

| | Approach A | Approach B |
|---|------------|------------|
| **Primary work** | New/edited **JSON** per product; `npm run seed:products`; **fixture tests** against **one** engine | **TypeScript** changes across local calculator, option rules, accessories; **and** seed/edge updates if parity required |
| **Scaling** | **Author data** — same interpreter | **Author code** — linear growth in branches (`productCode === …`) unless continuously refactored |
| **“Split paths + generate code per product”** | Not required — new **system_type** + seeds | **Does not** stay simple — multiplies surfaces and **sync** burden |

---

## 4. Adding clients (multi-tenant)

- **A:** New **organisation**, catalog/pricing rows, users’ `profiles.org_id` — same app binary, different **data**.
- **B:** **Local BOM** does not naturally vary per org; supporting multiple trade clients with different SKUs/tiers usually means **abandoning** local as authoritative, **per-org bundles**, or **server-only** BOM for real quotes.

---

## 5. Security and reverse engineering

- **Anything shipped to the browser is inspectable** (DevTools, bundle analysis). **LLM-assisted** reverse engineering lowers the **effort** to understand minified code; it does not create the exposure.
- **A (intended):** **Rules and tier pricing** live **server-side**; client receives **results**; trace/computed can be **admin-gated**.
- **B (fallback):** **Local calculator + bundled pricing/components** risks exposing **commercially sensitive** numbers and logic if that path serves **real** quotes.

---

## 6. One engine vs “specialised calculator per product” (code)

- **Separate full BOM implementation per fence product** usually **does not** scale: **N×** maintenance, tests, and merge conflict surface for **similar** domain (runs, segments, posts, slats, selectors, tiers).
- **Better pattern:** **One engine**, **many products** as **data** (seeds); **many specialised experiences** via **`product_variables`** and UI — specialised **UX**, not specialised **interpreter**, unless the problem domain truly diverges (different BOM shape, different costing model, hard isolation requirements).

---

## 7. “Code is cheap” (including AI codegen)

- **Cheap:** First draft of rules, selectors, or imperative TS.
- **Expensive:** **Keeping two engines aligned**, support when **anonymous ≠ logged-in** totals differ, security review of shipped bundles, **golden tests** for regressions.
- **B** increases the chance that **cheap edits** land in **one path only**, causing **silent desync**.

---

## 8. Accidental AI rewrites

### Approach A — risks and mitigations

| Risk | Mitigation |
|------|------------|
| Broken **`math.js`** expressions or **selector priority** (no type error) | Golden **payload → lines** tests per product; spot-check **trace** (admin) |
| Invalid seed shape | **`npm run seed:products`** + JSON Schema |
| **Canonical schema** drift between client and `supabase/functions/_shared` | Single intentional change list when updating Zod/types |

### Approach B — risks and mitigations

| Risk | Mitigation |
|------|------------|
| AI updates **local BOM** but not **edge seeds** | Treat **edge-only** as authoritative; or remove duplicate logic |
| **Triple truth:** UI rules vs DB `product_variables` vs engine | Drive options from **one source** (prefer DB-driven form for production) |
| Refactor changes **rounding** once | **Golden totals** tests; label local path **non-authoritative** if kept |

---

## 9. Additional tradeoffs

| Topic | Approach A | Approach B |
|-------|------------|------------|
| **Latency / UX** | Network + possible cold start; debouncing | **Instant** local recompute after load |
| **Cost / abuse** | Edge invocations + DB reads; **rate limits** for public | CPU on user device; large **bundle** if seeds + calc inlined |
| **Versioning / disputes** | **`rule_versions`** can correlate to saved quotes if persisted | Tie-break to **deploy SHA**; harder to prove exact logic for an old quote |
| **Audit / liability** | Clear story: server computed with **org** catalog | Ambiguous if **local** path is ever **authoritative** |
| **Developer onboarding** | Requires working Supabase + seeds for full BOM | UI can run **without** backend — risk of **not** testing real engine |
| **Merge conflicts** | Many small JSON rows | Very large TS files — painful merges |
| **Engine evolution** | New pipeline capability can **unlock all products** after migration | More **per-product** branches over time |
| **Disaster recovery** | **DB + repo seeds** | Client bundle matters if logic lived only there |

---

## 10. Sandbox branch reference (colleague’s work)

The branch **`codex/qshs-calculator-sandbox`** (on `origin`) illustrates **Approach B**:

- Adds **`src/lib/localBomCalculator.ts`** (~800+ lines imperative BOM).
- Adds **`src/lib/localSeedData.ts`** (raw imports of seed JSON + synthetic components/pricing).
- Adds **`src/lib/productOptionRules.ts`** (hardcoded option matrices overlapping DB-driven variables).
- **`useBomCalculator`**: falls back to **`calculateLocalBom`** when Supabase is unavailable, there is no session, or the edge call errors.

**Production use** of that branch as-is implies accepting **dual-engine drift** and **client-visible pricing/logic** on the fallback path unless those pieces are removed or scoped (estimate-only, tier1-only, marketing disclaimer).

---

## 11. Recommendations (concise)

1. **Canonical BOM / quotes:** **Approach A** only; server **re-validates** payload semantics as needed.
2. **Public or marketing calculator:** Prefer **server-side estimate** (anonymous edge, **rate limited**, optional **rounded** or **subset** SKUs) — not a full second BOM engine in JS.
3. **If a client fallback exists:** Mark as **estimate** / **offline**; **log** which path produced the result for support; **do not** ship full wholesale rules on that path.
4. **Process:** CI on seeds; **golden tests** on `bom-calculator`; checklist when touching **canonical types** in both app and `_shared`.

---

## 12. Exporting this document to PDF

- **From the repo:** open this file in **VS Code / Cursor**, **Print** → **Save as PDF**, or paste into **Google Docs / Word** and export PDF.
- **Pandoc:** `pandoc docs/calculator-architecture-tradeoffs.md -o calculator-architecture-tradeoffs.pdf` (PDF output may require a LaTeX engine or use `-o …docx` and export PDF from Word).
