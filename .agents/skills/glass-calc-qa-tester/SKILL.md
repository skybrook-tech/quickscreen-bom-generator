---
name: glass-calc-qa-tester
description: Test Glass Outlet BOM calculators against formulated Excel/XLSM sheets, CSV price lists, seed JSON, catalogue rules, and browser/app output. Use when Codex needs to audit calculation accuracy, build test scenarios, compare expected quantities/prices, find missing calculators, report defects, or create regression coverage.
---

# Glass Calculator QA Tester

Use this skill to find calculation defects and coverage gaps.

## QA Mission

- Compare app BOM output against source-of-truth spreadsheets, catalogue formulas, seed JSON, and CSV prices.
- Report what works, what is wrong, what is unverified, and what calculators still need to be created.
- Prioritize quantity defects over visual polish.
- Preserve source evidence: workbook name, sheet name, cell/formula/table, catalogue page, CSV row, seed file path, and app scenario.

## Default Sources

Project root:
`C:\Users\bbfen\Documents\Glass outlet pricelist and formula sheets`

Focus folders:
- `Glass outlet xlsm sheets formulated sheets`
- `Glass Outlet csv pricelist`
- `Glass Outlet Catalogues`
- `Seed Files`
- `outputs\glass_outlet_consolidated`
- `quickscreen-bom-generator`

## Testing Workflow

1. Inventory available workbooks and identify which product/system each appears to cover.
2. For the current product slice, extract relevant formulas and tables from workbooks.
3. Create small hand-checkable scenarios before large matrix tests.
4. Compare formulas against app engine code and generated BOM lines.
5. Check stock optimization: BOM quantity must usually be purchasable stock lengths/packs, not finished cut pieces.
6. Check pricing: unit price source, quantity-break logic, GST, and grand total.
7. Record missing calculators and data gaps separately from bugs.

## Report Shape

Use these sections:
- Executive summary.
- Working calculations.
- Confirmed defects.
- Suspected defects needing source confirmation.
- Missing calculators/product families.
- Recommended next tests.
- Evidence references.

## High-Risk Checks

- Slats: stock lengths required versus finished slat pieces.
- Side frames/CFC/F-sections: stock optimization from cut lengths.
- CSR: threshold by panel width, not run width.
- Spacers/screws: pack rounding.
- Posts: count by boundaries/corners/gates/walls and mounting type.
- Mount accessories: auto-add versus suggested.
- Colours: slat colour versus post colour override.
- Quantity-break pricing: selected tier and applicable break.
