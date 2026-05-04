# Technical handoff: calculator approaches (this branch vs `codex/qshs-calculator-sandbox`)

> **Audience:** Engineers or an AI session (e.g. Claude in the browser) that need a **concrete map** of what lives where, how BOM runs, and how the **sandbox branch** diverges from **current `master`**.
>
> **Related (do not duplicate):** [`calculator-architecture-tradeoffs.md`](./calculator-architecture-tradeoffs.md) — decision record for **Approach A** (data-driven edge engine) vs **Approach B** (client / dual-path). This handoff adds **file-level and branch-level** detail.

---

## 1. Repositories and refs

| Ref | Meaning |
|-----|---------|
| **This repo** | `quickscreen-bom-generator` — canonical product codebase. |
| **“This branch”** | As of authoring, default development line is **`master`** (verify with `git branch --show-current`). |
| **Sandbox remote branch** | **`origin/codex/qshs-calculator-sandbox`** — experimental work illustrating **client-side BOM fallback** and a **public calculator** route. It is **not** merged into `master`; inspect via `git show origin/codex/qshs-calculator-sandbox:<path>`. |

To fetch the sandbox tip locally:

```bash
git fetch origin codex/qshs-calculator-sandbox
```

---

## 2. Three layers to keep separate

1. **BOM engine execution** — where SKU/qty/math runs (`bom-calculator` edge vs in-browser `calculateLocalBom`).
2. **Calculator UX shell** — accordion v3 vs two-column v4, slide-out layout/gates, local draft persistence.
3. **Product / option constraints** — Postgres `product_variables` (production v3 form) vs **`productOptionRules.ts`** (hardcoded matrices shared by v4 normalisation and sandbox-era UI).

Confusing these causes “we fixed the seed but the dropdown is wrong” (different layer).

---

## 3. Current branch (`master`): production-aligned architecture

### 3.1 BOM engine (Approach A only)

- **All authoritative BOM output** for shipped calculators goes through **`POST /functions/v1/bom-calculator`** (Supabase Edge, Deno).
- Rules, selectors, companions, validations, pricing resolution → Postgres seeds + `npm run seed:products`; see `docs/bom-calculator-pipeline.md`.
- **Client hook** `src/hooks/useBomCalculator.ts` invokes the edge function **only**. No local BOM fallback; errors surface to the mutation.

```7:14:src/hooks/useBomCalculator.ts
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: string }) => {
      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload, pricingTier },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
```

- **Supabase client** requires real env vars at bundle load time (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); missing → throws during import (`src/lib/supabase.ts`). There is **no** “demo mode” without backend.

### 3.2 Routing and auth

From `src/App.tsx`:

| Path | Guard | Page |
|------|--------|------|
| `/`, `/fence-calculator`, `/calculator` | `AuthGuard` | `CalculatorV3Page` |
| `/fence-calculator-v4` | `AuthGuard` | `CalculatorV4Page` |
| `/quotes`, `/login`, `/admin/*` | as listed | … |

**Implication:** unauthenticated users cannot run the calculator on `master` without changing `AuthGuard` — unlike the sandbox branch (see §4).

### 3.3 Two calculator shells sharing one engine

Both v3 and v4 call the **same** `useBomCalculator` and speak the **same** `CanonicalPayload` / engine response shape.

| Surface | Route | State container | Role |
|---------|--------|-----------------|------|
| **v3** | `/fence-calculator` | `CalculatorContext` (`src/context/CalculatorContext.tsx`) | Accordion workflow: `ProductSelectV3`, `SchemaDrivenForm` driven by **`product_variables`** from DB, `LayoutCanvasV3`, `BOMResultTabs`, trace/warnings for admins. |
| **v4** | `/fence-calculator-v4` | `CalculatorContextV4` (`src/context/CalculatorContextV4.tsx`) | Two-column job/run list + sticky BOM; layout map and gates as **slide-out panes**; richer **BOM editing** (removed lines, qty overrides, extras, **suggested accessories**). |

**v4-specific behaviour (still edge-backed for BOM):**

- **Local persistence** of draft job + BOM edits: `src/lib/v4DraftStorage.ts` (`localStorage` key `glass-outlet-v4-calculator-draft`).
- **Suggested accessories** are **heuristic client add-ons** after a BOM exists — `src/lib/suggestedAccessories.ts` + `SuggestedAccessoriesPanel` under `src/components/calculator-v4/Bom/`. They are **not** the engine; comments in code mark prices as indicative.

### 3.4 Canvas and canonical bridge

- Shared engine: `src/components/canvas/canvasEngine.ts` (vanilla TS; no React).
- **v3** uses `LayoutCanvasV3` → `FenceLayoutCanvas` (original wrapper).
- **v4** uses `FenceLayoutCanvasV4` → imports **`FenceLayoutCanvas.v2`** and the same **`canonicalAdapter`** (`canvasLayoutToCanonical`, `canonicalToCanvasLayout`, merge helpers).

So v4 is a **UI/state wrapper** change; geometry ↔ canonical conversion stays shared.

### 3.5 `productOptionRules.ts` on `master` (~251 lines)

Exists on **both** lines of development: it encodes **finite option matrices** (finish families, slat sizes, gaps, colours, max panel width per system) used heavily by **v4** variable normalisation (`normaliseVariablesForSystem`, etc.). This **overlaps conceptually** with DB `product_variables` / constraints — the tradeoffs doc’s “triple truth” risk applies if someone edits one and not the other.

### 3.6 What is *not* on `master`

- `src/lib/localBomCalculator.ts`
- `src/lib/localSeedData.ts`
- Optional Supabase / session bypass in `useBomCalculator`

Those exist **only** on the sandbox branch (§4).

---

## 4. Sandbox branch (`origin/codex/qshs-calculator-sandbox`): dual-path + public demo affordances

### 4.1 Dual-path `useBomCalculator`

The sandbox version tries the edge function when Supabase is configured **and** the user has a session; otherwise it returns **`calculateLocalBom(payload, tier)`**.

Rough decision order (from branch):

1. If `!isSupabaseConfigured` → local BOM.
2. If no auth session → local BOM.
3. If `supabase.functions.invoke('bom-calculator', …)` errors → local BOM.

So the sandbox is deliberately **resilient** for demos and offline UI work at the cost of **two implementations** of BOM logic (see tradeoffs doc).

### 4.2 Permissive Supabase client

Sandbox `src/lib/supabase.ts`:

- Exports **`isSupabaseConfigured`**.
- Creates a client even when env is missing, using **placeholder** URL/key so imports do not throw — enabling the local path to run without `.env.local`.

`master` **throws** if env is absent — stricter, production-oriented.

### 4.3 Large client-side BOM implementation

| File (sandbox only) | Approx. size | Purpose |
|---------------------|--------------|---------|
| `src/lib/localBomCalculator.ts` | ~806 lines | Imperative BOM: supported products (e.g. `QSHS`, `BAYG`, `VS`), colour maps, stock/component qty rules mirroring **some** engine behaviour. |
| `src/lib/localSeedData.ts` | ~556 lines | `?raw` imports of seed JSON from `supabase/seeds/glass-outlet/products/*.json`, **synthetic** components and bundled **`pricing_rules`** tiers for local pricing. |
| `src/lib/productOptionRules.ts` | Same family as `master` | Hardcoded option matrices; shared conceptual overlap with DB-driven forms. |

**Security / IP note:** anything in `localSeedData` + `localBomCalculator` ships to the browser — inspectable, bundleable, **not** suitable as the sole source of truth for protected wholesale pricing unless that exposure is explicitly accepted.

### 4.4 Routing differences (important)

Sandbox `App.tsx` (simplified):

- **`/calculator`** → **`CalculatorV3Page` with no `AuthGuard`** — public calculator (pairs with local BOM when not logged in).
- **`/new`** → legacy **`MainApp`** (v1-era surface) behind `AuthGuard`.
- **`/`** redirects to `/calculator` (not `/fence-calculator`).
- Includes **`/quote/:id`** route.

`master` removed legacy v1 routes and **wraps** calculators in `AuthGuard`.

### 4.5 `CalculatorV3Page` divergence

Sandbox’s `CalculatorV3Page.tsx` is **much larger** than `master`’s (~600 line delta vs `master` in a `git diff --stat` snapshot). Notable additions include:

- **`PricingTierSelect`** — tier passed into `useBomCalculator` / edge body.
- **`suggestAccessories`** from `src/lib/suggestedAccessories` and **`SuggestedAccessoriesPanel`** under **calculator-v3** (on `master`, suggested accessories are scoped to **v4** + `buildAccessorySuggestions`).
- **Per-line quantity edits** (`lineEdits`), CSV export (Papaparse), **save quote** flow, navigation — heavier “job workspace” on the v3 accordion layout.

So the sandbox is not just “local BOM”; it is also a **prototype product UX** for tier selection, accessories, and quoting from the v3 page.

---

## 5. Comparison matrix (quick reference)

| Topic | `master` (this repo) | `codex/qshs-calculator-sandbox` |
|-------|------------------------|--------------------------------|
| **Authoritative BOM** | Edge `bom-calculator` only | Edge when session + config OK; else **local** |
| **Pricing in browser** | Results only (tiers resolved server-side) | Full tier tables + rules possible on fallback path |
| **Env / Supabase** | Required | Optional with placeholders |
| **Auth on calculator** | Required (`AuthGuard`) | **`/calculator` public** |
| **v4 UI** | Present (`/fence-calculator-v4`) | Not in sandbox snapshot reviewed (likely absent or older) |
| **Legacy v1 `MainApp`** | Removed | Still routed at `/new` in sandbox `App.tsx` |
| **Suggested accessories** | v4 (`buildAccessorySuggestions`) | v3 page + `suggestAccessories` |

---

## 6. Practical guidance for follow-up work

1. **Merging sandbox ideas into production:** Treat **local BOM** as **non-authoritative** or remove it; if you keep a public calculator, prefer a **rate-limited anonymous edge** path over shipping full rules (see `calculator-architecture-tradeoffs.md` §11).
2. **Cherry-picking UX:** Tier selector, line edits, CSV, save — worth porting **without** `localBomCalculator` if the goal is parity with business workflow.
3. **Keeping options consistent:** When changing QSHS behaviour, prefer **seed JSON + engine tests**; update `productOptionRules.ts` only when v4 / normalisation must stay aligned.
4. **Verification checklist:** After any port, diff **`useBomCalculator`**, **`supabase.ts`**, and **`App.tsx` routing** — these three control **who can invoke what** and **which BOM path runs**.

---

## 7. File index (bookmark list)

### `master` — BOM / calculator

- `src/hooks/useBomCalculator.ts` — edge-only mutation.
- `src/pages/CalculatorV3Page.tsx` — v3 accordion calculator.
- `src/pages/CalculatorV4Page.tsx` — v4 two-column calculator.
- `src/context/CalculatorContext.tsx` — v3 payload + BOM result.
- `src/context/CalculatorContextV4.tsx` — v4 job/runs/BOM editing state.
- `src/lib/productOptionRules.ts` — hardcoded option normalisation.
- `src/lib/v4DraftStorage.ts` — v4 `localStorage` draft.
- `src/lib/suggestedAccessories.ts` — v4 heuristic suggestions.
- `src/components/calculator-v4/LayoutMap/FenceLayoutCanvasV4.tsx` — v4 canvas bridge (uses `FenceLayoutCanvas.v2`).

### Sandbox-only (reference via `git show`)

- `src/lib/localBomCalculator.ts`
- `src/lib/localSeedData.ts`
- `src/hooks/useBomCalculator.ts` — dual path.
- `src/lib/supabase.ts` — `isSupabaseConfigured` + placeholder client.

---

## 8. Document history

- **Created** for handoff to a Claude browser / engineering session: contrasts **`master`** with **`origin/codex/qshs-calculator-sandbox`**, and documents **v3 vs v4** on the current branch.

When branches move, re-verify line counts and routes with `git show origin/codex/qshs-calculator-sandbox:…` and `git grep` on `master`.
