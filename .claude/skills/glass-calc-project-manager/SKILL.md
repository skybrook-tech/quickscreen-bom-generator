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
- Keep project skills mirrored in both `.claude/skills/` and `.agents/skills/`. When a pattern is learned in a brief, update both copies before closing the work.
- For UI briefs, record reusable decisions in the UI skill, calculation/seed decisions in `quickscreen-bom` or `seed-mapper`, and process decisions here.
- Current sidebar standard: run, section, and gate settings must share the `SettingsDisclosureRow` selected-value pattern. Any future calculator should reuse that pattern before adding new settings.
- Current disclosure timing standard: settings rows and run-settings wrappers use 60 seconds of inactivity before auto-collapse, and opening another disclosure closes the previous one immediately.
- Current right-pane entry standard: calculator entry and Clear Job default to the BOM tab, with the map still reachable from the header Map/BOM segmented control; BOM actions live in the header and hide on Map view.
- Current data convention: `finish_family` is the slat-range field. Do not add a parallel `slat_range` field unless the seed model changes deliberately.
- Current scope convention: run settings hold defaults that truly span a run; height is section-level and must not be treated as a run default. Section system overrides are allowed, but must be called out and tested because they affect BOM dispatch.
- Current termination convention: hide End Conditions UI from the sidebar, but preserve underlying termination data because canvas and BOM dispatch use it.
- Current mapper convention: map address search sits above the canvas; map type/opacity/scale live in a collapsed popover; `Draw Fence` is the product run tool; `Dotted line`, building rectangles, freehand strokes, text notes, and existing post/pillar markers are site-context annotations that must persist through layout reloads without becoming BOM lines.
- Current canvas-editor convention: Ortho, free-draw styling, right-click context actions, per-item Delete/Backspace removal, and annotation drag/resize are UI/editor behaviours. Keep them out of BOM rules unless a fence/gate/termination field explicitly consumes the data.

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
