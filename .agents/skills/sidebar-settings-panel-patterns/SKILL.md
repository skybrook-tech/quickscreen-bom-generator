---
name: sidebar-settings-panel-patterns
description: Reusable UX patterns for sidebar settings panels with disclosure rows, auto-collapse, match indicators, and hierarchical card layouts. Extracted from building a production calculator with run/section/gate settings parity.
---

# Sidebar Settings Panel Patterns

## Core Pattern: SettingsDisclosureRow

The workhorse component for settings panels. Every setting uses the same layout:

```
[ Label (left) .............. Selected Value (right, bold) ]  [show ▸]
```

- **Label:** left-aligned, regular weight, describes the setting
- **Value:** right-aligned, bold black text, shows the current selection
- **Action link:** "show" in brand-primary (blue), toggles the expanded dropdown
- **Expanded state:** the row expands to show the full option picker below

### Why this matters
When every setting uses the same pattern, the user learns the interaction once and it works everywhere. Run settings, section settings, and gate settings should be visually identical — same fonts, same spacing, same interaction. Side-by-side screenshots should look the same except for content.

## Hierarchical Settings: Run → Section → Gate

### The cascade model
- **Run** defines defaults for all sections and gates in that run
- **Section** inherits run defaults but can override any setting
- **Gate** inherits run defaults but can override (for gate-relevant settings only)

### The green match indicator
When a child's (section or gate) settings match the parent (run) defaults, show a green indicator chip (e.g. "S1" in green). When they differ, show the chip in a neutral colour and list which settings differ.

**Match comparison rules:**
- Compare ONLY settings that exist at both levels
- Ignore settings that are inherently per-child (e.g. height is per-section, swing direction is per-gate)
- A newly created child should ALWAYS show green (it inherits all defaults)

**Tooltip on chip:** "Click to restore to run settings" — communicates both the clickable action and what it does.

**Click action:** resets the child's overridden settings back to run defaults.

## Dropdown Grouping

Group related settings into combined dropdowns instead of one-dropdown-per-setting:

```
System type               [QSHS ▸]
Slats, colors, and spacings  [65mm / Black Satin / 9mm ▸]
Post size, mounting and spacing  [50mm / Concreted / 2600mm ▸]
```

### Why combined dropdowns work better
- Reduces visual clutter (3 rows instead of 8)
- The collapsed summary value shows the most important selections at a glance
- Expanding reveals all related options together for coherent decision-making
- The same grouping applies to ALL card types (run, section, gate) for consistency

### Summary value format
The collapsed row shows a slash-separated summary of key selections:
- "65mm / Black Satin / 9mm" (slat size / colour / gap)
- "50mm / Concreted / 2600mm" (post size / mounting / max spacing)

## Auto-Collapse with Mutual Exclusion

### Timer-based auto-collapse
- A dropdown left open with no interaction auto-collapses after **60 seconds**
- Timer resets when the user interacts (clicks, selects, hovers over options)
- 10 seconds is too aggressive; 60 seconds feels natural

### Mutual exclusion
- Opening dropdown B immediately collapses dropdown A
- Only one dropdown is expanded at a time within a card
- This is MORE important than the timer — it prevents visual overload

## Card Header Hierarchy

Each card (run, section, gate) has a consistent header structure:

```
Card Name — Key Value 1 — Key Value 2
  [collapsed summary of all settings below]
```

- **Card name** (Run 1 / Section 1 / Gate 1): heading weight, larger
- **Key values** (length, height, width): bold, slightly smaller, on the same line
- **Subheading:** always-visible summary of settings, below the header, no editable inputs (editing happens in expanded dropdowns)

### Consistency across card types
All three card types use the same pattern:
- Run: `Run 1 — 12.5m` + subheading with system type, colour, slat size, gap, post mounting, corners
- Section: `Section 1 — 40.00m — 1823mm` + subheading showing only settings that differ from run
- Gate: `Gate 1 — 1200mm` + subheading showing gate type, swing direction

## Two-Click Safety (ConfirmButton)

Destructive actions use a shared two-click pattern:

1. **First click:** button text changes to "Confirm?" + visual warning state (red/danger)
2. **Second click within 3 seconds:** action executes
3. **Timeout or click elsewhere:** reverts to original state

Use for: Clear Map, Clear Job, Remove Run, Remove Section, Remove Gate.

**Key:** this is a shared component (`ConfirmButton`), not per-feature implementation. Every destructive action uses the same component with the same timing and visual treatment.

## Expand-to-Canvas Interaction

"Click canvas element → auto-scroll sidebar to settings → auto-expand that settings panel"

This is the simplest version of "edit-from-canvas" and works with zero new components:
1. User clicks a gate/section marker on the canvas
2. Sidebar smoothly scrolls to that item's card
3. The card's settings expander auto-opens
4. User edits in the sidebar; changes sync back to canvas

More complex alternative: inline popover on the canvas near the clicked element. Only build this if the sidebar-scroll approach feels insufficient.

## Entry Flow Pattern: Icon-Button → Expand → Apply → Collapse

For secondary input methods (like "Describe Your Fence"):
1. **Collapsed state:** a compact icon button (e.g. message icon) below primary action buttons
2. **Click:** expands to reveal the input area (text area, options)
3. **Submit (Apply):** processes the input and applies settings
4. **After apply:** input collapses back to the icon button
5. **Re-accessible:** user can click the icon again to modify

This keeps the sidebar clean while providing access to the secondary input method.

## Settings That Don't Belong

Through iteration, some settings were removed or relocated:

- **Corner count:** belongs in run subheading as read-only display (derived from map geometry), NOT as an editable control in run settings
- **Height:** belongs on the section (per-section attribute), NOT on the run. Different sections often have different heights.
- **Length:** already shown in the card header — don't duplicate in the subheading summary

**General rule:** if a value is already displayed elsewhere, don't show it again. If a value is derived from geometry, show it read-only in the display area, not as an editable control.
