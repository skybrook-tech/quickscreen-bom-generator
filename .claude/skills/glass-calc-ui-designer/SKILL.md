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
- Use the shared settings-row pattern for run, section, and gate settings: label on the left, selected value on the right, blue `show`/`hide` affordance, one open dropdown at a time, and a 60-second idle collapse. This pattern lives in `src/components/calculator-v3/SettingsDisclosureRow.tsx`.
- Keep setting groups semantically consistent across levels:
  - Run settings: `System type`, `Slats, colors, and spacings`, `Post size, mounting and spacing`, `Run corner count`.
  - Section settings: `System type`, `Slats, colors, and spacings`, `Post size, mounting and spacing`; show only non-height overrides from run settings unless expanded.
  - Gate settings: mirror section settings, with gate-specific rows for type, opening direction, and hardware.
- Treat height as a section-level attribute, not a run-level default. Section headers should keep the install-critical format `Section N - X.XXm(L) - YYYYmm(H)` with the height visually stronger than the length; matching-run indicators ignore height differences.
- Per-section system overrides are advanced but supported: store the override on the section and keep the section green only when the non-height settings, including system type, match the run.
- Gate green-match indicators compare only system/build, colour, slat size, and gap size against the run. Swing type, opening direction, hinge side, hardware, and gate height are gate-specific choices and must not turn the match indicator off.
- Settings disclosures use a 60-second inactivity timer and should close immediately when another settings disclosure opens. Run settings wrappers should follow the same timing.
- Keep a small muted hint near the run-to-section boundary explaining that green section/gate codes mean the settings match the run.
- Treat `finish_family` as the app's "Slat range" field. Current values are `standard`, `economy`, and `alumawood`; it controls valid colours, slat sizes, and SKU-series selection.
- Hide alternate post colour unless the user asks for it. Default post colour follows fence colour.
- Show colour tiles as swatches with the 1-2 letter catalogue code overlaid; the full colour name belongs in hover/title text or selected-value summaries.
- Treat the first workspace state as a real quoting decision point: Draw, Describe, and Select should appear as equal numbered choice cards when no run exists, then collapse once the user chooses a path.
- If the workspace exists but has no runs, show the four prominent system buttons in this order: QSHS, VS, XPL, BAYG. Clicking a button creates Run 1 and opens Run Settings.
- Use a shared two-click confirm pattern for destructive actions: first click enters a danger confirm state, second click within about 3 seconds commits, and outside click cancels.
- Treat "matches run defaults" indicators as signal, not noise: ignore structural geometry differences like corner/end-post conditions and only flag substantive setting overrides.
- Matching run settings should be visible through the section/gate code indicator. If settings differ, list only the differing settings under `Settings that differ from run settings`; if matching, show `Settings match run settings`.
- End-condition controls should not be shown in the sidebar unless explicitly reintroduced. Keep underlying termination data intact because BOM dispatch and canvas geometry still use it.
- For describe/parse previews, avoid a blocking "missing" state. Apply sensible defaults, visually highlight defaulted chips, and let the user override only what needs changing.
- Put derived values near the inputs they depend on: panels, post spacing, cut length, achieved height.
- Use product-code search for expert users and friendly labels for less technical users.
- After Generate BOM, keep the user in one place: BOM lines, warnings, suggested extras, manual extras, GST, grand total.
- BOM headers should include a printable run/section summary above line items: bold run hero line, compact settings, post/corner/end-post summary, indented sections with panel count/post spacing, overrides, and gate sub-items.

## Mapper UI Principles

- Drawing geometry is the source of layout truth.
- Exact typed measurements are the source of dimension truth.
- Use persistent Map / Plan tabs for the right pane. The two tabs are views into the same calculator state; neither tab owns separate layout data, and switching views must not remount or lose the drawing.
- Keep connected segments connected when editing lengths.
- Endpoint drag should pivot around the opposite end of the section: the dragged post moves freely, the far end stays planted, and adjacent sections deform only when they share that dragged post.
- Show the active endpoint clearly.
- Allow finish-run gestures that do not require pixel-perfect clicks.
- Surface segment details without forcing the user to hunt through nested panels.

## Section-Owned Gate UX

- Gates belong to the section they interrupt. In this repo's v3 canonical payload, represent that as a flat `gate_opening` segment with a `parent_section_id` variable so the BOM engine keeps its existing run/segment scope.
- Show gate chips inside the parent section card and let users edit or two-click remove them from there.
- Plan view should render gates in the section strip; Map view should render the same gate at its drawn canvas position.

## Review Checklist

- Do system choices change slat sizes, gaps, colours, post sizes, and accessories correctly?
- Is every visible option valid for the current system?
- Does adding/removing extras immediately update totals?
- Is it clear which BOM lines are required versus suggested?
- Can the user find and edit the thing they just drew?
- Does the UI still work on a laptop viewport without overlapping text?
