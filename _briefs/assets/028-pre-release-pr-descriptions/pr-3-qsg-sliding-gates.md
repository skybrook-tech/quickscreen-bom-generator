# PR — QSG Sliding Gates calculator

**Branch:** `codex/qsg-sliding-gates-calculator` (commit 7c955a2)
**Base:** `main`
**Mark as:** Draft
**Blocked on:** PR #1 (ColorBond UI consistency) must merge first. Then **rebase this branch** before opening this PR.

---

## Summary

Extends `qs_gate.json` with the full QSG sliding gate variant via Codex's data-driven pattern: 7 new variables, 58 sliding rules, 47 selectors, 5 validations. Small `bom-calculator/lib.ts` typing fix. Minor UI changes in `GateSegmentDetails.tsx` (constrains swing slats to 65mm, restricts gaps to seeded 5/9/20mm).

## What's in this PR

- `supabase/seeds/glass-outlet/products/qs_gate.json` — extended with QSG sliding variant
- `supabase/functions/bom-calculator/lib.ts` — small typing fix
- `src/components/calculator-v3/GateSegmentDetails.tsx` — UI constraints for sliding gates

## Critical: workbook regression required

This PR **must not merge** until QSG sliding gates passes workbook regression on at least 3 representative configurations from `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx`. See `qsg-workbook-regression-checklist.md` in the same folder.

The pattern Codex demonstrated (data-driven sliding gate as a `gate_movement` variant on the existing QS_GATE product, no new TypeScript calculator logic) is the right architectural model — proves that adding gate variants is data-driven authoring, not code. But the math.js expressions and selector matches need workbook validation before going live.

## Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes including `localBomCalculator.test.ts` UNCHANGED
- [ ] `npm run build` passes
- [ ] `npm run seed:products` succeeds against the target Supabase project (after merge)
- [ ] **Workbook regression: at least 3 configurations from QSG sliding gates V2-T1 workbook match line-for-line.**
- [ ] Netlify deploy preview: a sliding gate added to a fence renders correctly on iPhone Safari, with the right hardware in the BOM
- [ ] PR base branch is `main` (NOT `master`)
- [ ] Branch was rebased on top of PR #1 (ColorBond UI consistency) before opening this PR
- [ ] Math.js string comparisons use `equalText()` not `==` (per `discovery.md`)

## Known gotcha

The QSG sliding work introduces `gate_movement` as a per-quote variable on the existing QS_GATE product. After brief 033 lands, all QS_GATE rows are tagged with `system_instance_id = qs-gate` (combined swing + sliding) — see brief 033's mapping table for the rationale.

## After merge

- Run `npm run seed:products` to push the extended qs_gate.json to Supabase.
- Update `readiness_status` on the `qs-gate` system_instance from `calculator_ready` to `spreadsheet_tested` once workbook regression is in.
- Update `readiness_status` to `approved` once admin signs off (manual via brief 035's admin UI once that ships).