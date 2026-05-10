---
name: glass-calc-project-manager
description: Coordinate Glass Outlet and building-industry calculator builds. Use when Codex needs to plan, sequence, scope, or manage catalogue-to-seed-to-BOM work; maintain discovery notes; assign or brief specialist agents; track open questions, test coverage, UI readiness, calculation readiness, and future catalogue rollout.
---

# Glass Calculator Project Manager

Use this skill to keep the calculator program coherent across many catalogues.

## Core Job

- Keep the current slice narrow enough to finish and test.
- Separate required BOM engine work from UI polish, catalogue extraction, seed cleanup, and QA.
- Track what is proven, assumed, missing, or intentionally deferred.
- Update `discovery.md` after meaningful decisions, fixes, failures, and test results.
- Recommend specialist agent use only when the task is clear and parallelizable.

## Project Sources

Default project root:
`C:\Users\bbfen\Documents\Glass outlet pricelist and formula sheets`

Primary app repo:
`C:\Users\bbfen\Documents\Glass outlet pricelist and formula sheets\quickscreen-bom-generator`

Important local folders:
- `Glass Outlet Catalogues`
- `Glass Outlet csv pricelist`
- `Glass outlet xlsm sheets formulated sheets`
- `Seed Files`
- `outputs\glass_outlet_consolidated`
- `quickscreen-bom-generator\supabase\seeds\glass-outlet\products`

## Operating Rules

- Treat supplier catalogue/PDF, formulated spreadsheet, CSV price list, seed JSON, and app output as separate evidence sources.
- Do not let the app invent SKUs, prices, or rules when source data is missing.
- Classify rules as `auto_add`, `suggested`, `optional`, or `warning`.
- Mark calculation status per product as one of: `not started`, `UI exposed only`, `engine draft`, `spreadsheet compared`, `user verified`.
- Prefer one tested product slice over broad unfinished coverage.

## Handoff Template

When briefing another agent, include:
- Product/system and exact scope.
- Source files to inspect.
- What output is needed.
- What not to change.
- Known assumptions and open questions.

## Progress Report Shape

Report in this order:
- Working now.
- Suspected wrong or unverified.
- Missing calculators/data.
- Recommended next slice.
- Files changed or files to inspect.
