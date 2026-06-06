# PR — Run/Section/Gate UI consistency (ColorBond components)

**Branch:** `codex/brief-031-run-section-gate-ui-consistency` (commit dec7b59)
**Base:** `main`
**Mark as:** Draft

---

## Summary

UI consistency pass across run / section / gate components, with first ColorBond visual treatment. 22 files touched, no calculator-behaviour changes.

## What's in this PR

- ColorBond component visual styling (matches the existing system family conventions)
- Run / section / gate UI alignment (spacing, sizing, icon usage)
- Minor `tasks.md` + `app-overview.md` housekeeping

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] Netlify deploy preview renders the ColorBond surface on iPhone Safari
- [ ] Run / section / gate tap targets are reachable on iPhone (44px minimum)
- [ ] No regression on the existing QSHS / VS / XPL / BAYG UI surfaces
- [ ] PR base branch is `main` (NOT `master`)

## Notes

- This branch was committed by Codex on 2026-05-27. It has been sitting unmerged pending PR opening. No rebase needed if it still applies cleanly to current `main`; if it conflicts, rebase before opening.
- This is the FOUNDATION of the stack — `codex/qsg-sliding-gates-calculator` was started from this branch's tip, so this must merge first.