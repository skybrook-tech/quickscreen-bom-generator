# Pre-release Antigravity branches awaiting human review

Three branches were committed by Antigravity agents before the brief queue stabilised. They are stacked (each one was started from the previous one, not from `main`) and so cannot all be merged independently.

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
- Antigravity's earlier "PR link: open on GitHub" message was inaccurate — the PRs were never actually opened. Verify in the GitHub UI.
- Run `npm run seed:products` after merging anything that touches seed JSON.

This file moves out of `03-paused/` once all three branches are merged or closed.
