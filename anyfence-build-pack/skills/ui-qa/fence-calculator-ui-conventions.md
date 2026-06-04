---
skill: fence-calculator-ui-conventions
id: cmppjzrzs06mo07adv9tzbmxf
description: UI conventions for any fence BOM calculator with a canvas/mapper component — section-owned gate UX (gates as flat segments with parent_section_id), mapper UI principles (endpoint pivot, Ortho snapping, free-draw, plain installer language), Print BOM ordering (materials first, then run/section details, then optional map), and the two-click destructive confirm pattern. Complements sidebar-settings-panel-patterns and editorial-design-system-v2 without duplicating them.
whenToUse: 
tags: 
---

# Fence Calculator UI Conventions

UI patterns specific to fence calculators with a canvas/mapper component — distinct from generic SaaS sidebar patterns (`sidebar-settings-panel-patterns`) and the brand-token / typography layer (`editorial-design-system-v2`).

## When to use

- Designing the canvas editor for a fence-drawing tool
- Handling gate placement that interrupts a fence section
- Laying out Print BOM output for installers
- Implementing destructive actions (Clear BOM, delete run, remove gate)
- Switching between Map and BOM views in a calculator app

## Section-owned gate UX

Gates belong to the **section they interrupt**, not to the run. In the canonical payload, represent that as a flat `gate_opening` segment with a `parent_section_id` variable — this keeps the BOM engine's existing run/segment scope intact while the UI treats gates as section children.

### Display

- Show gate chips **inside the parent section card** (not as a sibling of the section).
- Let users edit or two-click-remove gates from there.
- **Plan view** renders gates in the section strip.
- **Map view** renders the same gate at its drawn canvas position — never desync.

### Gate match indicators (intentionally narrower than section indicators)

When checking whether a gate "matches run defaults", compare only:

- System / build
- Colour
- Slat size
- Gap size

Swing type, opening direction, hinge side, hardware, and gate height are **gate-specific choices** and must NOT turn the match indicator off. A gate that swings outward when the run defaults to inward is still a "matches run" gate — that's by design.

## Mapper UI principles

### Drawing geometry vs typed measurements

- **Drawing geometry is the source of layout truth** (what's connected to what).
- **Exact typed measurements are the source of dimension truth** (how long each segment is).
- Click a segment label pill → input appears over canvas → type mm → Enter moves all downstream nodes. This is the only way to set exact lengths.

### Map/BOM tab persistence

- Use persistent **Map / BOM tabs** for the right pane.
- The two tabs are views into the **same calculator state**; neither owns separate layout data.
- Switching views must not remount or lose the drawing.

### Endpoint drag semantics

When the user drags a post endpoint:

- The dragged post moves freely.
- The far end of the dragged section stays planted (pivot point).
- Adjacent sections deform only when they share the dragged post.
- Show the active endpoint clearly (highlight ring or larger handle).

### Finish-run gestures

Don't require pixel-perfect clicks. Acceptable finish gestures:

- Double-click anywhere
- Press Enter / Escape
- Click within ~10px of the original start node to close a loop

### Plain installer language for tools

Use the words installers say in the field, not CAD vocabulary:

| Tool | Label |
|---|---|
| Product fence run | `Draw Fence` |
| Non-product context line | `Dotted line` |
| Click-drag rectangle | `Building` |
| Hand-sketched line | `Free Draw` |
| Existing pillar / post (for termination context) | `Existing post` / `Pillar` (dimensioned) |

### Map controls hierarchy

- **Address search** sits above the canvas.
- **Map type / opacity / px-per-metre scale** live in a collapsed map-settings popover beside the address input.
- Don't scatter these across the toolbar.

### Annotations are site context, never BOM

Dotted lines, buildings, freehand strokes, text notes, and existing post / pillar markers are **site context only**. They must persist through form / canvas sync but **must not create BOM product lines** — unless termination logic explicitly consumes them (e.g. an existing pillar terminates the fence).

### Canvas controls — discoverable but compact

- **Ortho** is a persistent snapping toggle (always visible).
- **Free-draw** exposes colour / width / style / opacity / arrow controls **only while active**.
- Map items should support **Move / Edit** selection, **Delete / Backspace** removal, and a **right-click menu** for edit / duplicate / delete / z-order.
- Ortho, free-draw styling, right-click context actions, per-item Delete/Backspace, and annotation drag/resize are UI/editor behaviours — keep them out of BOM rules unless a fence/gate/termination field explicitly consumes the data.

## Print BOM ordering (installer-first)

Print output must lead with the work to be done, not project metadata. Canonical order:

1. **Line items** — materials, quantities, pricing, totals first.
2. **Run & Section Details** reference block — using the same labels as the sidebar: System Type, Color, Slat size, Gap size, Post mounting, Max post spacing, Corners. Height stays section-level.
3. **Gate sub-items** under their parent section.
4. **Optional map** at the very bottom.

Run & section detail labels must match the sidebar exactly so the installer's eye doesn't have to retrain between screen and paper.

## Map / BOM switcher

- The primary Map/BOM view switcher belongs in the **top app header** as a segmented control.
- **BOM actions** (`Generate BOM`, `Clear BOM`, `Print BOM`, `Include map`, `Export CSV`) live beside the switcher **only while BOM is active**.
- They do NOT repeat inside the BOM panel body.
- They hide when the user is on the Map view.

## Two-click destructive confirm

For Clear BOM, delete run, remove gate, and other destructive actions:

1. First click → enter a **danger confirm state** (button colour shifts, label changes to "Confirm" or "Click again to clear").
2. Second click within ~3 seconds → commits the action.
3. Outside click → cancels and returns to default state.

No modal. No "are you sure?" dialog. The button itself is the confirm surface.

## "Matches run" indicators

- Treat match indicators as **signal, not noise** — ignore structural geometry differences like corner / end-post conditions and only flag substantive setting overrides.
- Visible through the section / gate code indicator chip.
- If settings differ → list only the differing settings under `Settings that differ from run settings`.
- If matching → show `Settings match run settings`.
- Code chip hover title: `Click to restore to run settings`. Don't add persistent green-code helper copy in the sidebar — keep the hover affordance.

## End-condition controls

- Hide End Conditions UI in the sidebar **unless explicitly reintroduced**.
- Keep underlying termination data intact — BOM dispatch and canvas geometry still use it.

## Describe / parse preview chips

- Avoid a blocking "missing" state.
- Apply sensible defaults; visually highlight defaulted chips so the user can see what was inferred.
- Let the user override only what needs changing — don't force them to confirm every field.

## What this skill does NOT cover

- Disclosure-row mechanics (label/value/chevron, 60s collapse, one-at-a-time) → see `sidebar-settings-panel-patterns`
- Typography, brand tokens, AI-vs-user output styling → see `editorial-design-system-v2`
- Per-system BOM calculation rules → see the system-specific calculator skills (QSHS, VS, XPL, BAYG, treated-pine-paling-fence-calculator)
- Conversational quote flow → see `quickscreen-conversational-bom-flow`
