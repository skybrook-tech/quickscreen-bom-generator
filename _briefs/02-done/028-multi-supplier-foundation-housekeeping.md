# Brief 028 — Multi-Supplier Foundation Housekeeping

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main` (NOT `master`)
**Depends on:** nothing — this is the first brief in the new repo's multi-supplier rollout. Ships before brief 032.
**Estimated PR size:** small (docs landing, file moves, cleanup; no code, no schema)
**Primary reference:** the two architecture docs landing in this brief (`docs/multi-supplier-platform-architecture.md`, `docs/system-authoring-process.md`)

---

## Goal

Lay down the foundation so the multi-supplier brief queue (032 onwards) can execute autonomously:

1. Land the two canonical architecture docs on `main` (currently they sit on the unmerged `codex/glass-outlet-calculator-rollout-setup` branch and have never reached `main`).
2. Land `_briefs/MASTER-BRIEF.md` (the orchestration prompt Liam pastes to Codex; new repo doesn't have one yet).
3. Land `_briefs/INVENTORY.md` (the status table).
4. Clean stale briefs `022-bottom-nav-save-button.md` and `023-app-icon-swap.md` out of `_briefs/00-inbox/` — they were merged in the original `skybrook-tech/quickscreen-bom-generator` repo and are leftovers from the 2026-05-26 fork.
5. Move the obsoleted `030-catalogue-model.md` (if any sibling appears in the queue) to `_briefs/03-paused/obsoleted/` with a NOTE.md explaining the conflict (migrations 030/031 are already used; this brief proposed a conflicting `products` table).
6. Document the three unmerged stacked Codex branches (`codex/brief-031-run-section-gate-ui-consistency`, `codex/glass-outlet-calculator-rollout-setup`, `codex/qsg-sliding-gates-calculator`) so Liam can open their PRs in the GitHub UI — these were Codex's prior work that never reached PR.
7. Copy the production cutover runbook from the asset bundle to `_briefs/03-paused/production-cutover-runbook.md` and the pre-release PR descriptions to `_briefs/03-paused/pre-release-pr-descriptions/` (Liam executes these manually; they're not Codex briefs).

After this lands, the queue is clean and the multi-supplier architecture docs are the canonical source of truth referenced by every following brief.

## Hard rules

- **PR base branch is `main`** (NOT `master`).
- **Draft PR only.** Human review gate.
- **`src/lib/localBomCalculator.ts` must not be modified** (and isn't — this brief is docs/files only).
- **`localBomCalculator.test.ts` passes UNCHANGED.**
- **Do NOT touch `package.json`, `package-lock.json`, or any TypeScript files.** This brief is markdown + file moves only.
- **Do NOT rebase / merge the three unmerged Codex branches.** That's a human decision (they have known stacking and need careful review). The brief only documents them.
- **Skip the Deno integration job** — known red on XP-BTP-B fixture, pre-existing.

## Files this brief touches

| File | Type of change |
|---|---|
| `docs/multi-supplier-platform-architecture.md` | NEW (or replace if already present) — copy from `_briefs/assets/030a-multi-supplier-platform-architecture.md` |
| `docs/system-authoring-process.md` | NEW (or replace if already present) — copy from `_briefs/assets/030a-system-authoring-process.md` |
| `_briefs/MASTER-BRIEF.md` | NEW — copy from `_briefs/assets/030a-MASTER-BRIEF.md` |
| `_briefs/INVENTORY.md` | NEW — initial status table (see template below) |
| `_briefs/00-inbox/022-bottom-nav-save-button.md` | DELETE — already merged in original repo |
| `_briefs/00-inbox/023-app-icon-swap.md` | DELETE — already merged in original repo |
| `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` | NEW — documents the three stacked Codex branches (uses template below) |
| `_briefs/03-paused/pre-release-pr-descriptions/` | NEW — copy from `_briefs/assets/028-pre-release-pr-descriptions/` (4 files: README.md + 3 PR description templates + 1 workbook regression checklist) |
| `_briefs/03-paused/production-cutover-runbook.md` | NEW — copy from `_briefs/assets/028-production-cutover-runbook.md` (Liam executes when ready to point Netlify at the new repo) |
| `_briefs/00-inbox/028-multi-supplier-foundation-housekeeping.md` → `_briefs/02-done/028-multi-supplier-foundation-housekeeping.md` | MOVE — this brief moves to done after PR opens |

**Explicitly NOT touched:**

- Anything under `src/`
- Anything under `supabase/`
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`
- The three unmerged Codex branches
- Any existing seed JSON

## Assets bundled with this brief

The architecture docs, MASTER-BRIEF, pre-release PR descriptions, and production cutover runbook are pre-staged in `_briefs/assets/` (Liam extracts the housekeeping tarball before pasting MASTER-BRIEF to Codex):

- `_briefs/assets/030a-multi-supplier-platform-architecture.md`
- `_briefs/assets/030a-system-authoring-process.md`
- `_briefs/assets/030a-MASTER-BRIEF.md`
- `_briefs/assets/028-pre-release-pr-descriptions/` (4 files)
- `_briefs/assets/028-production-cutover-runbook.md`

Step 0 of execution:
1. Copy the architecture docs and MASTER-BRIEF to their destinations
2. Copy the entire `028-pre-release-pr-descriptions/` directory to `_briefs/03-paused/pre-release-pr-descriptions/`
3. Copy the production cutover runbook to `_briefs/03-paused/production-cutover-runbook.md`

## INVENTORY.md template

Create `_briefs/INVENTORY.md` with this initial content:

```markdown
# Brief Inventory — quickscreen-colorbond-generator

| # | Title | Status | PR | Notes |
|---|---|---|---|---|
| 028 | Multi-supplier foundation housekeeping | in-progress | — | This brief |
| 032 | Supplier + Archetype + Instance schema | inbox | — | Depends on 028 |
| 033 | Data backfill — Glass Outlet supplier + archetypes + instances + provenance | inbox | — | Depends on 032 |
| 034 | Versioned price books + quote pinning | inbox | — | Depends on 033 |
| 035 | Admin UI — Suppliers + Instances CRUD | inbox | — | Depends on 033 |
| 036 | Admin UI — Products CRUD + bulk CSV/Cin7 import | inbox | — | Depends on 035 |
| 037 | Admin UI — Rule authoring (template + data) | inbox | — | Depends on 036 |
| 038 | Workbook regression upload + diff | inbox | — | Depends on 037 |
| 039 | User-scoped authoring + RLS | inbox | — | Depends on 035 |
| 040 | Community publication path | inbox | — | Depends on 038 + 039 |
| 041 | Quality reports + demotion automation | inbox | — | Depends on 040 |
| 042 | Discount Fencing — supplier + system instances (6 instances incl. aluminium slat gate) | inbox | — | Depends on 033 |
| 043 | Discount Fencing — seed data + price book v1 (3 seeded instances: timber, aluminium pool, slat gate) | inbox | — | Depends on 042 + 034 |
| 044 | Platform org + visibility layer (Layer 5) | inbox | — | Depends on 043 |
| 045 | Amazing Fencing — supplier + system instances (6 instances: ColorBond, PermaSteel, timber paling, slat screen, chainwire, retaining wall) | inbox | — | Depends on 033 |
| 046 | Amazing Fencing — seed data + PUBLISHED tier2 trade price book (6 instances; ~40 SKUs priced from Cin7 export; ColorBond/PermaSteel/slat/chainwire pricing pending) | inbox | — | Depends on 045 + 034 |

## Pre-release Codex branches (not in the brief queue)

| Branch | Commit | Status |
|---|---|---|
| `codex/brief-031-run-section-gate-ui-consistency` | dec7b59 | Awaiting PR from Liam |
| `codex/glass-outlet-calculator-rollout-setup` | 4b2d70a | Superseded by brief 028 (architecture docs now land via this brief) |
| `codex/qsg-sliding-gates-calculator` | 7c955a2 | Awaiting PR + workbook regression |

See `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` for the review plan.

## Stop points encountered

(empty)
```

## PRE-RELEASE-CODEX-BRANCHES.md template

Create `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md` with this content:

```markdown
# Pre-release Codex branches awaiting human review

Three branches were committed by Codex agents before the brief queue stabilised. They are stacked (each one was started from the previous one, not from `main`) and so cannot all be merged independently.

## codex/brief-031-run-section-gate-ui-consistency (dec7b59)

ColorBond components + UI consistency. 22 files. Earliest in the stack.

**Recommended action:** Liam opens a PR with base `main`, reviews, and merges. This unblocks the rest of the stack.

## codex/glass-outlet-calculator-rollout-setup (4b2d70a)

Was originally going to add `docs/multi-supplier-platform-architecture.md`, `docs/glass-outlet-range-rollout.md`, and update `app-overview.md` + `tasks.md`. **Superseded:** brief 028 now lands the architecture docs directly to `main`. This branch can be cherry-picked for the `glass-outlet-range-rollout.md` and the `app-overview.md` updates, or closed without merging.

**Recommended action:** Cherry-pick the non-architecture-doc files into a small follow-up PR, then close this branch without merging.

## codex/qsg-sliding-gates-calculator (7c955a2)

QSG sliding gate calculator: extends `qs_gate.json` with the full sliding gate variant (7 new variables, 58 sliding rules, 47 selectors, 5 validations), small `bom-calculator/lib.ts` typing fix, minor UI changes in `GateSegmentDetails.tsx`.

**Workbook regression required:** `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx` against 3-5 representative sliding-gate configs. Until this passes, the PR should NOT merge.

**Recommended action:** Once brief 031 lands (so the stack base is on `main`), open a PR for this branch. Run workbook regression. Merge only after regression passes line-by-line on at least 3 configs.

## Common gotchas

- The QSG branch builds on the rollout-setup branch, which builds on the brief-031 branch. Rebase order matters.
- Codex's earlier "PR link: open on GitHub" message was inaccurate — the PRs were never actually opened. Verify in the GitHub UI.
- Run `npm run seed:products` after merging anything that touches seed JSON.

This file moves out of `03-paused/` once all three branches are merged or closed.
```

## Tests

No code changes; no new tests. CI must still pass:

- `npm run typecheck` — green (unchanged code)
- `npm run test` — green (including `localBomCalculator.test.ts` unchanged)
- `npm run build` — green
- Deno integration job — skip (known red)

## CI checks expected to pass

- typecheck ✓
- unit tests ✓
- build ✓
- deploy preview matches `main` visually (intentional — no UI changes)

## PR description template

```markdown
## Brief 028 — Multi-Supplier Foundation Housekeeping

Lays down the orchestration foundation for the multi-supplier brief queue (briefs 032-043).

### What's in this PR

- Lands `docs/multi-supplier-platform-architecture.md` (the 5-layer model — canonical architecture reference)
- Lands `docs/system-authoring-process.md` (the three-tier identity model + authoring workflow + trust tiers)
- Lands `_briefs/MASTER-BRIEF.md` (the orchestration prompt Liam pastes to Codex)
- Lands `_briefs/INVENTORY.md` (status table)
- Removes stale briefs `022-bottom-nav-save-button.md` and `023-app-icon-swap.md` from `_briefs/00-inbox/` (merged in the original repo; leftovers from the 2026-05-26 fork)
- Documents the three unmerged stacked Codex branches in `_briefs/03-paused/PRE-RELEASE-CODEX-BRANCHES.md`

### What's NOT in this PR (by design)

- No code changes
- No schema changes
- No changes to the three unmerged Codex branches (separate human review)
- No changes to `localBomCalculator.ts`, `canonicalAdapter.ts`, or `canvasEngine.ts`

### Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] No visible changes in the deploy preview
- [ ] PR base branch is `main` (NOT `master`)
```

## Stop points

If the housekeeping tarball's `_briefs/assets/` doesn't contain the three architecture / master-brief files, **STOP** — you can't fabricate them. Surface and ask Liam to re-upload.

If `docs/multi-supplier-platform-architecture.md` or `docs/system-authoring-process.md` already exist on `main` (someone landed them via another path), prefer the version in `_briefs/assets/` — it's the current canonical version per the 2026-05-27 design.

## After this PR merges

The brief queue is unblocked. Brief 032 can now reference `docs/multi-supplier-platform-architecture.md` and `docs/system-authoring-process.md` and find them.

Recommended order from here:
- Open PRs for the three pre-release Codex branches (per `PRE-RELEASE-CODEX-BRANCHES.md`)
- Then re-paste MASTER-BRIEF to pick up brief 032