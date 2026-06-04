# Pre-release Codex branches — PR descriptions + merge order

Three branches were committed by Codex agents before the brief queue stabilised. They need to be opened as PRs in the GitHub UI and reviewed before the multi-supplier brief queue (028+) runs.

**Recommended merge order:**

1. `codex/brief-031-run-section-gate-ui-consistency` (dec7b59) — opens FIRST, base `main`. UI cleanup; no calculator behaviour change. Foundation for the stack.
2. `codex/glass-outlet-calculator-rollout-setup` (4b2d70a) — **cherry-pick selectively, then close branch**. The architecture docs are now landed via brief 028; the docs/glass-outlet-range-rollout.md + tasks.md + app-overview.md updates from this branch should be cherry-picked into a small follow-up PR. Then close the branch without merging.
3. `codex/qsg-sliding-gates-calculator` (7c955a2) — opens LAST, base `main`. Rebase on top of (1) after (1) merges. **Do not merge until QSG workbook regression passes** (see `qsg-workbook-regression-checklist.md` in this folder).

The three PR description templates are in this folder. Copy them verbatim when opening each PR.

If you (Liam) prefer to skip the rebase-and-merge dance for the three pre-release branches and instead let them age out in favour of fresh briefs, that's a valid alternative — the brief queue 028-044 doesn't depend on any of this work specifically. The ColorBond UI cleanup is the only piece that would meaningfully impact user experience; the rest is either superseded (rollout-setup) or pending validation (QSG sliding).