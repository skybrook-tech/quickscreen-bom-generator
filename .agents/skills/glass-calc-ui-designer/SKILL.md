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
- Use the shared settings-row pattern for run, section, and gate settings: label on the left, selected value on the right, blue chevron affordance, one open dropdown at a time, and a 60-second idle collapse. This pattern lives in `src/components/calculator-v3/SettingsDisclosureRow.tsx`.
- Keep setting groups semantically consistent across levels:
  - Run settings: `System type`, `Slats, colors, and spacings`, `Post size, mounting and spacing`; corner count is read-only in the run heading/details and comes from geometry.
  - Section settings: `System type`, `Slats, colors, and spacings`, `Post size, mounting and spacing`; show only non-height overrides from run settings unless expanded.
  - Gate settings: exactly four groups: `Gate Type & Direction`, `Slat, Post & Colour`, `Hardware & Weight`, and `Gate Components`.
- Treat height as a section-level attribute, not a run-level default. Section headers should keep the install-critical format `Section N - X.XXm - YYYYmm`; length and height are bold on the same line, and matching-run indicators ignore height differences.
- Per-section system overrides are advanced but supported: store the override on the section and keep the section green only when the non-height settings, including system type, match the run.
- Gate green-match indicators compare only system/build, colour, slat size, and gap size against the run. Swing type, opening direction, hinge side, hardware, and gate height are gate-specific choices and must not turn the match indicator off.
- Settings disclosures use a 60-second inactivity timer and should close immediately when another settings disclosure opens. Run settings wrappers should follow the same timing.
- Explain green section/gate codes through the code-chip hover title: `Click to restore to run settings`. Do not add persistent green-code helper copy in the sidebar.
- Treat `finish_family` as the app's "Slat range" field. Current values are `standard`, `economy`, and `alumawood`; it controls valid colours, slat sizes, and SKU-series selection.
- Hide alternate post colour unless the user asks for it. Default post colour follows fence colour. Place alternate post colour directly below the main colour picker in both run and section settings.
- Show colour tiles as swatches with the 1-2 letter catalogue code overlaid; the full colour name belongs in hover/title text or selected-value summaries.
- Treat the first workspace state as BOM-first: after job entry, the right pane opens on BOM instructions, while the sidebar shows the four prominent system buttons in this order: QSHS, VS, XPL, BAYG.
- Use a compact message-icon affordance below the four system buttons for Describe Your Fence with `(Click to describe)` underneath. It expands into the description input, uses `Apply`, and disappears once the user selects a system or applies a description until the job is cleared.
- Keep the primary Map/BOM view switcher in the top header as a segmented control. BOM actions (`Generate BOM`, `Clear BOM`, `Print BOM`, `Include map`, `Export CSV`, and shortcuts) live beside it only while BOM is active; they should not be repeated inside the BOM panel body.
- Use a shared two-click confirm pattern for destructive actions: first click enters a danger confirm state, second click within about 3 seconds commits, and outside click cancels.
- Treat "matches run defaults" indicators as signal, not noise: ignore structural geometry differences like corner/end-post conditions and only flag substantive setting overrides.
- Matching run settings should be visible through the section/gate code indicator. If settings differ, list only the differing settings under `Settings that differ from run settings`; if matching, show `Settings match run settings`.
- End-condition controls should not be shown in the sidebar unless explicitly reintroduced. Keep underlying termination data intact because BOM dispatch and canvas geometry still use it.
- For describe/parse previews, avoid a blocking "missing" state. Apply sensible defaults, visually highlight defaulted chips, and let the user override only what needs changing.
- Put derived values near the inputs they depend on: panels, post spacing, cut length, achieved height.
- Use product-code search for expert users and friendly labels for less technical users.
- After Generate BOM, keep the user in one place: BOM lines, warnings, suggested extras, manual extras, GST, grand total.
- Map/BOM switching belongs in the app header as a visually distinct segmented control. BOM actions (`Generate BOM`, `Clear BOM`, `Print BOM`, `Include map`, `Export CSV`) belong beside it and must only be visible while the BOM view is active.
- Print BOM should lead with materials, quantities, pricing, and totals. Put `Run & Section Details` after the line items using the same run-setting labels as the sidebar, include section length x height, panels/post spacing, overrides, and gate sub-items, and place the optional map last.

## Mapper UI Principles

- Drawing geometry is the source of layout truth.
- Exact typed measurements are the source of dimension truth.
- Use persistent Map/BOM tabs for the right pane. The two tabs are views into the same calculator state; neither tab owns separate layout data, and switching views must not remount or lose the drawing.
- Keep connected segments connected when editing lengths.
- Endpoint drag should pivot around the opposite end of the section: the dragged post moves freely, the far end stays planted, and adjacent sections deform only when they share that dragged post.
- Show the active endpoint clearly.
- Allow finish-run gestures that do not require pixel-perfect clicks.
- Surface segment details without forcing the user to hunt through nested panels.
- Keep map address search above the canvas. Satellite/roadmap type, opacity, and px/m scale belong in a collapsed map-settings popover beside the address input.
- Use plain installer language in map tools: `Draw Fence` for product fence runs, `Dotted line` for non-product context lines, `Building` for click-drag rectangles, `Free Draw` for hand sketches, and dimensioned `Existing post` / `Pillar` markers for termination context.
- Print Map should fit the drawn bounds into the output, optionally include the satellite underlay, and include a compact installer summary with job name, total metres, run count, gate count, and date.
- Canvas annotations such as dotted lines, buildings, freehand strokes, text notes, and existing post/pillar markers are site context only. They must persist through form/canvas sync but must not create BOM product lines unless termination logic explicitly consumes them.
- Professional map-editing controls should stay discoverable but compact: Ortho is a persistent snapping toggle, free-draw exposes colour/width/style/opacity/arrow controls only while active, and map items should support Move/Edit selection, Delete/Backspace removal, and a right-click menu for edit/duplicate/delete/z-order actions.

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
