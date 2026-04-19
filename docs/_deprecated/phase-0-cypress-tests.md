# Phase 0 — Cypress Test Suite

> **This phase must be completed before writing any application code.**

## Goal

Establish the complete Cypress E2E test suite that serves as the acceptance criteria for the entire project. The tests define exactly what the React app must do to achieve feature parity with the existing HTML app.

## Why This Comes First

The tests ARE the acceptance criteria. They define exactly what the React app must do to achieve feature parity. Building without them means guessing whether the BOM calculation is correct. Every subsequent phase should end with running the relevant test subset to verify correctness.

TC1 and TC5 are already VERIFIED against the source of truth (Excel formulas + master price file).

## Steps

1. Install Cypress and TypeScript support
2. Create `cypress/support/selectors.ts` — the selector abstraction layer using `data-testid` attributes
3. Create `cypress/support/helpers.ts` — `fillFenceConfig()`, `addGate()`, `generateBom()`, `assertBomLine()`, `assertGrandTotal()`, etc.
4. Create all 23 test files (TC1–TC19, TC24–TC26) across the section folders
5. Create pricing fixture files (`tier1.json`, `tier2.json`, `tier3.json`)
6. Add `data-testid` attributes to the existing HTML app (non-destructive)
7. Run the suite against the existing HTML app — TC1 and TC5 (VERIFIED) should pass
8. Document any failures — these are either test bugs or existing app bugs to investigate

## Reference

- See `CYPRESS_TEST_SPEC.md` for full test case definitions
- Expected values come from verified Excel formulas and the master price file
- The selector abstraction layer (`data-testid`) means the same tests run against both the existing HTML app and the new React app

## Test Coverage

| Area | Test Cases |
|------|-----------|
| BOM line items (product codes, quantities, unit prices, line totals) | TC1–TC5 |
| Accessory quantity formulas (spacer packs, screw packs, caps, plates) | TC6–TC10 |
| Grand totals across all 3 pricing tiers | TC11–TC14 |
| Colour code switching | TC15–TC16 |
| System type switching | TC17–TC18 |
| Post count logic | TC19 |
| Edge cases | TC24–TC26 |

## Completion Criteria

- All 23 test files created
- TC1 and TC5 pass against the existing HTML app
- All other failures are documented with root cause (test bug vs app bug)
