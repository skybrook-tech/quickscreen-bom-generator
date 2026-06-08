---
name: calculator-project-coordination-playbook
id: cmppjzkc106pi07ady720zwes
source: Hyperagent knowledge base
exported: 2026-06-08
platform_builtin: false
pinned: false
tags: []
credentials: []
---

# calculator-project-coordination-playbook

> Project coordination playbook for parametric calculator builds (QuickScreen, Anyfence, any tradie SaaS calculator) — 5-state calculation-status taxonomy, evidence-source separation discipline, narrow-slice-over-broad-coverage rule, specialist-agent handoff template, and progress report shape. Captures the project-management discipline that keeps a calculator program coherent across many catalogues and many parallel workstreams.

## When to use
(not specified)

## Documentation
# Calculator Project Coordination Playbook

Project-management discipline for keeping a multi-catalogue, multi-fence-type calculator program coherent. Applies to The Glass Outlet's QuickScreen build, the Anyfence calculator network, and any future tradie SaaS calculator with multiple parallel workstreams.

## Core job

- Keep the current slice narrow enough to **finish and test**.
- Separate required BOM engine work from UI polish, catalogue extraction, seed cleanup, and QA.
- Track what is **proven**, **assumed**, **missing**, or **intentionally deferred**.
- Update the project context doc (or `discovery.md`) after meaningful decisions, fixes, failures, and test results.
- Recommend specialist agent dispatch **only when the task is clear and parallelizable**.

## 5-state calculation-status taxonomy

Mark each product / fence type with one of:

| State | Meaning |
|---|---|
| `not started` | No work has begun. |
| `UI exposed only` | The product appears in pickers / forms but no engine math exists. |
| `engine draft` | First-pass BOM rules exist; not verified against source. |
| `spreadsheet compared` | Engine output matches the source-of-truth XLSM / formula sheet within tolerance. |
| `user verified` | A human has walked a worked example end-to-end and confirmed the BOM. |

This is the canonical taxonomy — don't invent ad-hoc statuses like "almost done" or "needs review". Pick one of these five and write the next milestone underneath.

## Evidence-source separation discipline

Treat each of these as a **separate evidence source**. Never let one overwrite another silently:

1. Supplier catalogue / PDF
2. Formulated spreadsheet (XLSM)
3. CSV pricelist
4. Seed JSON
5. App output

### Rules

- Do not let the app invent SKUs, prices, or rules when source data is missing.
- Classify every rule as one of: `auto_add`, `suggested`, `optional`, `warning`.
- When sources disagree, record the conflict in the project doc and ask the user — don't pick a side silently.

## Narrow-slice rule

- **Prefer one tested product slice over broad unfinished coverage.**
- A single user-verified fence type (e.g. QSHS at 1800mm, post-to-post, 90mm slat, 9mm gap, black) is worth more than five `engine draft` products.
- Roll forward one slice at a time. Resist the urge to "also fix" adjacent products in the same PR.

## Skill mirroring rule

Some projects (e.g. quickscreen-bom-generator) keep skills mirrored in both `.claude/skills/` and `.agents/skills/`. When a pattern is learned in a brief, update both copies before closing the work.

## Specialist-agent handoff template

When briefing another agent (subagent or human), include:

1. **Product / system and exact scope** — what's in, what's out.
2. **Source files to inspect** — paths, sheet names, page numbers.
3. **What output is needed** — schema, file format, where it goes.
4. **What NOT to change** — protected files, stable contracts, existing behaviour.
5. **Known assumptions and open questions** — call them out before they bite.

Don't say "research X" without specifying what shape the answer should take. Don't dispatch a subagent without an output contract.

## Progress report shape

When reporting status to the user, use this order:

1. **Working now** — what's verified, with evidence.
2. **Suspected wrong or unverified** — what needs source confirmation.
3. **Missing calculators / data** — coverage gaps.
4. **Recommended next slice** — narrowest unit that adds real value.
5. **Files changed or files to inspect** — paths for the user's reference.

Lead with what works (builds confidence). Surface what's broken (builds trust). Recommend what's next (drives momentum).

## Project-doc maintenance

After meaningful decisions or test results, update the project context doc with:

- **Decisions** — what was chosen and why.
- **Numbers & Values** — measurements, prices, SKU codes that need to persist.
- **Constraints** — what we can't do and why.
- **Notes** — anything else worth keeping.

If multiple threads in the same project will benefit, write to the project doc, not the thread context doc.

## Standing UI conventions for QuickScreen (canonical at time of writing)

These are project-specific to QuickScreen but recorded here because they're decisions a project manager needs to enforce. For new calculators, defer to the underlying skills (`fence-calculator-ui-conventions`, `sidebar-settings-panel-patterns`) rather than re-deciding.

- Sidebar settings use the `SettingsDisclosureRow` pattern across run, section, and gate settings: label-left, value-right, blue chevron expand/collapse, one open dropdown, 60-second idle collapse.
- The calculator's "Slat range" maps to `finish_family` (`standard`, `economy`, `alumawood`). Do not invent a parallel `slat_range` field.
- End-condition data remains in the model for canvas / BOM terminations, but the End Conditions sidebar UI is intentionally hidden.
- Run settings hold defaults that truly span a run; **height is section-level** and must not be treated as a run default. Section system overrides are allowed but must be called out and tested because they affect BOM dispatch.
- Map address search sits above the canvas; map type / opacity / scale live in a collapsed popover; `Draw Fence` is the product run tool; `Dotted line`, buildings, freehand strokes, text notes, and existing post / pillar markers are site context.
- Calculator entry and Clear Job default to the BOM tab; map reachable from the header Map/BOM segmented control; BOM actions in the header, hidden on Map view.

## What this skill does NOT cover

- Calculator math itself → per-system skills (QSHS, VS, XPL, BAYG, treated-pine-paling-fence-calculator, etc.).
- Seed JSON structure → `quickscreen-seed-data-conventions` or `anyfence-fence-config-schema`.
- UI specifics → `fence-calculator-ui-conventions`, `sidebar-settings-panel-patterns`, `editorial-design-system-v2`.
- Catalogue extraction → `supplier-catalogue-extractor`.
- QA workflow → `fence-calculator-qa-tester`.

## Scripts
None
