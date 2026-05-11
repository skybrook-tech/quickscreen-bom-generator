---
name: glass-calc-ui-designer
description: Design and improve the Glass Outlet calculator UI, quote workflow, option selection, suggested accessories flow, BOM review, and fence mapper experience. Use when Codex needs to make the calculator cleaner, faster, more trade-friendly, easier to test, or closer to a professional drawing/quoting app.
---

# Glass Calculator UI Designer

Use this skill when improving how users configure, draw, review, and test quotes.

## Design Goals

- Make the first screen usable as the actual quoting workspace, not a landing page.
- Keep trade users fast: system, dimensions, layout, options, BOM, and suggestions should be scannable.
- Show only valid options for the selected system and current choices.
- Make suggested accessories obvious but not automatically included.
- Make missing prices or unverified calculators visible rather than hidden.
- Keep mapper actions discoverable through controls, labels, and stable editing affordances.

## Calculator UI Principles

- Group choices by job, run, segment, gate, fixing, and add-ons.
- Prefer compact controls over long explanatory copy.
- Treat the first workspace state as a real quoting decision point: Draw, Describe, and Select should appear as equal numbered choice cards when no run exists, then collapse once the user chooses a path.
- Use a shared two-click confirm pattern for destructive actions: first click enters a danger confirm state, second click within about 3 seconds commits, and outside click cancels.
- Treat "matches run defaults" indicators as signal, not noise: ignore structural geometry differences like corner/end-post conditions and only flag substantive setting overrides.
- For describe/parse previews, avoid a blocking "missing" state. Apply sensible defaults, visually highlight defaulted chips, and let the user override only what needs changing.
- Put derived values near the inputs they depend on: panels, post spacing, cut length, achieved height.
- Use product-code search for expert users and friendly labels for less technical users.
- After Generate BOM, keep the user in one place: BOM lines, warnings, suggested extras, manual extras, GST, grand total.

## Mapper UI Principles

- Drawing geometry is the source of layout truth.
- Exact typed measurements are the source of dimension truth.
- Keep connected segments connected when editing lengths.
- Endpoint drag should pivot around the opposite end of the section: the dragged post moves freely, the far end stays planted, and adjacent sections deform only when they share that dragged post.
- Show the active endpoint clearly.
- Allow finish-run gestures that do not require pixel-perfect clicks.
- Surface segment details without forcing the user to hunt through nested panels.

## Review Checklist

- Do system choices change slat sizes, gaps, colours, post sizes, and accessories correctly?
- Is every visible option valid for the current system?
- Does adding/removing extras immediately update totals?
- Is it clear which BOM lines are required versus suggested?
- Can the user find and edit the thing they just drew?
- Does the UI still work on a laptop viewport without overlapping text?
