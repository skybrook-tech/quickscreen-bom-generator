# PR — Glass Outlet range rollout docs (cherry-picked from rollout-setup branch)

**Original branch:** `codex/glass-outlet-calculator-rollout-setup` (commit 4b2d70a)
**Strategy:** **cherry-pick selectively, then close the original branch without merging**
**Base:** `main`
**Mark as:** Draft

---

## Why cherry-pick instead of merge

The original `codex/glass-outlet-calculator-rollout-setup` branch added two files:
- `docs/multi-supplier-platform-architecture.md` — **SUPERSEDED** by brief 028 which lands a corrected version of this doc directly to `main`
- `docs/glass-outlet-range-rollout.md` — **KEEP** as-is (Codex's planned Glass Outlet range build order)
- `docs/tasks.md` and `docs/app-overview.md` updates — **KEEP** (housekeeping)
- `docs/canvas-engine-refactor-discovery.md` updates — **KEEP** (canvas history record)

Merging the whole branch would collide with brief 028's architecture-doc land. Cherry-pick only the docs that don't collide.

## Steps

```bash
# Start from main
git checkout main
git pull
git checkout -b chore/cherry-pick-rollout-setup-docs

# Cherry-pick the relevant files (NOT the architecture doc — that's superseded)
git checkout 4b2d70a -- docs/glass-outlet-range-rollout.md docs/tasks.md docs/app-overview.md docs/canvas-engine-refactor-discovery.md

git add docs/glass-outlet-range-rollout.md docs/tasks.md docs/app-overview.md docs/canvas-engine-refactor-discovery.md
git commit -m "chore: cherry-pick Glass Outlet rollout docs from codex/glass-outlet-calculator-rollout-setup (4b2d70a)"
git push -u origin chore/cherry-pick-rollout-setup-docs
```

Open a PR with the description below.

After merge, **close the `codex/glass-outlet-calculator-rollout-setup` branch without merging** — its remaining content is the architecture doc which brief 028 lands separately.

---

## PR description (copy verbatim)

```markdown
## Cherry-pick: Glass Outlet rollout docs from rollout-setup branch

Pulls the non-architecture-doc files from `codex/glass-outlet-calculator-rollout-setup` (4b2d70a) so they reach `main`. The architecture doc itself is superseded by brief 028's version.

### Files cherry-picked

- `docs/glass-outlet-range-rollout.md` — Codex's planned build order for the Glass Outlet range (QSG sliding → ColorBond verification → Glass Pool → Aluminium Pool → Hamptons / Zeus / PIC → Screening → Balustrade)
- `docs/tasks.md` — task tracker updates
- `docs/app-overview.md` — app file map updates
- `docs/canvas-engine-refactor-discovery.md` — canvas refactor history

### Verification

- [ ] `npm run typecheck` passes (docs-only PR; should pass trivially)
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] No file conflicts with brief 028's planned changes (architecture doc lands separately)
- [ ] PR base branch is `main`

### After merge

Close the source branch `codex/glass-outlet-calculator-rollout-setup` without merging — its architecture doc is already superseded.
```