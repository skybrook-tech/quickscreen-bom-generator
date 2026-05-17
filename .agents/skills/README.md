# Project Agent Skills

Canonical Claude/Codex skill location in this repository:

`./.claude/skills/`

This `.agents/skills/` folder mirrors the same specialist skill set for project-agent workflows. Keep both folders in sync when a skill changes.

This folder stores the project-specific Codex skill files used to build and maintain the QuickScreen BOM Generator. Keeping them in the repository means future developers and AI agents can load the same specialist guidance instead of relying on one local machine profile.

## Skills

- `glass-calc-project-manager` - project sequencing, discovery notes, calculator rollout planning, and open-question tracking.
- `glass-calc-ui-designer` - calculator UI, quote workflow, BOM review, and layout-map usability.
- `glass-calc-qa-tester` - calculator accuracy audits against Excel sheets, seed data, catalogue rules, and browser output.
- `glass-calc-catalogue-extractor` - catalogue/PDF extraction into calculator-ready products, SKUs, rules, and questions.
- `quickscreen-bom` - QuickScreen / XPRESS product and BOM workflow guidance.
- `seed-mapper` - seed JSON authoring guidance for products, pricing, selectors, rules, and compatibility.

## How To Use

When starting work on this repo, ask Codex to use the relevant skill from `.agents/skills/<skill-name>/SKILL.md`. Load reference files only when the skill says they are needed.

When a local skill is improved, copy the updated skill folder back here and commit the change so the team has the same version.

## Current Shared Patterns To Preserve

- Sidebar settings use the `SettingsDisclosureRow` pattern across run, section, and gate settings: label-left, value-right, blue `show`/`hide`, one open dropdown, and 60-second idle collapse.
- The calculator's "Slat range" is `finish_family` (`standard`, `economy`, `alumawood`).
- End-condition data remains in the model for canvas/BOM terminations, but the End Conditions sidebar UI is intentionally hidden.
