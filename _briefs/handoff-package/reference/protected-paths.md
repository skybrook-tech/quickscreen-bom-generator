# Protected paths — DO NOT modify

These files are the BOM regression guards and shared contracts. Modifying them without an explicit brief that says "you may touch X" will silently break the calculator engine, the canonical-name contract, or both.

If you find yourself needing to change one of these, **stop and surface to Liam**.

## Calculator engine — touch nothing

| File | Why protected |
|------|---------------|
| `src/lib/localBomCalculator.ts` | BOM regression guard — its public signature and behaviour are frozen. The local calculator is non-authoritative; the server `bom-calculator` edge function is canonical. |
| `src/lib/localBomCalculator.test.ts` | Must pass UNCHANGED in every PR. If it doesn't pass, something broke. |
| `src/components/canvas/canonicalAdapter.ts` | Public function signatures stable. Internal refactors OK; signatures off-limits. |
| `src/components/canvas/canvasEngine.ts` | Public types stable. The canvas engine renders posts, spacings, dimensions — don't change the API surface. |

## Server-side calculator

| File | Why protected |
|------|---------------|
| `supabase/functions/bom-calculator/` | Canonical server-side BOM engine. Only modify when a brief explicitly says so. |
| `supabase/functions/bom-calculator/index_test.ts` | Regression test set — must pass UNCHANGED. |

## Anyfence build-pack — read-only

| File / directory | Why protected |
|------|---------------|
| `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py` | The canonical-name BOM math kernel for timber paling. Fence Forge owns this; the React app calls it via the engine. Don't modify; report bugs. |
| `anyfence-build-pack/schema/fence_system_config.schema.json` | The fence_system_config JSON Schema (validation contract). Changes go through a separate schema-version-bump brief. |
| `anyfence-build-pack/knowledge-pack/` | Documentation source-of-truth. Read but don't edit. |
| `anyfence-build-pack/fixtures/` | Golden input → expected BOM tests. Don't modify; they're the regression guard for the build-pack engine. |

## Canonical product names — versioned contract

See `reference/canonical-name-contract.md`. To restate: **never rename a canonical product name**. Adding new ones is fine (with a brief proposing them for Fence Forge review). Renames are a breaking change for every downstream supplier mapping.

## Migrations — only add, never modify

| File range | Why protected |
|------|---------------|
| `supabase/migrations/001_*.sql` through `031_*.sql` | Already applied. New work uses `057+`. |
| `supabase/migrations/032_*.sql` through `056_*.sql` | Atlas's recent platform-expansion migrations. Already applied to the feature branch. Don't modify; add new migrations on top if you need schema changes. |

## package.json — touch only when strictly necessary

- `package.json` — only modify when a brief explicitly says so. Use npm 10.x for `package-lock.json` changes.

## Build configuration

| File | Why protected |
|------|---------------|
| `vite.config.ts` | Build config. Don't change unless a brief says so. |
| `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.json` | TypeScript config. Don't change. |
| `tailwind.config.js` | Theme tokens. Add new tokens if needed; don't change existing ones (other components depend on them). |

## Cypress baseline tests

| File | Why protected |
|------|---------------|
| `cypress/e2e/bn_brief_smoke.cy.js` | Baseline smoke test — must pass UNCHANGED. |
| `cypress/e2e/property_map_ui.cy.js` | Property map regression — must pass UNCHANGED. |

## What you CAN modify

- All page-level components in `src/pages/`
- `src/components/` (with the exception of `canonicalAdapter.ts` and `canvasEngine.ts` as noted above)
- `src/hooks/` (add new hooks; don't break existing ones)
- New components (anywhere under `src/components/`)
- New migrations (`supabase/migrations/057_*.sql` and beyond)
- New routes (added to `App.tsx`)
- New skills and skill scripts (but propose canonical name additions before publishing)

## When in doubt

Open the file you want to modify in the diff view. If it's in this list — stop and surface to Liam.
