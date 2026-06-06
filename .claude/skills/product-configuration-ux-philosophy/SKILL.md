---
name: product-configuration-ux-philosophy
description: UX philosophy for product configurators: smart defaults over empty forms, multi-option suggestions over open-ended questions, progressive disclosure over everything-at-once. Extracted from iterating on a tradie calculator with real user testing.
---

# Product Configuration UX Philosophy

## Core Principles

### 1. Smart defaults over empty forms
Every setting should have a sensible default. The user should be able to generate a valid BOM/quote without changing a single setting. Defaults come from the most common real-world configuration.

**Example:** A fence calculator defaults to:
- System: QSHS (most common system)
- Colour: Black Satin (most popular colour)
- Slat size: 65mm (standard)
- Gap: 9mm (standard)
- Height: 1800mm (most common residential height)
- Post: 50mm standard, concreted in ground
- Max post spacing: 2600mm

The user types a length, presses Enter, and gets a complete BOM. Then they adjust what they need to.

### 2. Multi-option suggestions over open-ended questions
When the user needs to make a choice, present 2-4 concrete options with clear labels — don't ask an open-ended question.

**Bad:** "What fence type would you like?" (text input)
**Good:** Four buttons: QSHS | VS | XPL | BAYG (one click, done)

**Bad:** "Describe your mounting requirements" (text input)
**Good:** Three options: Concreted in ground | Base-plated to slab | Core-drilled (radio buttons)

### 3. Progressive disclosure: show complexity only when needed
Don't show every setting at once. Group settings into expandable sections. The collapsed state shows the current value; expanding reveals the options.

**Hierarchy:**
- **Always visible:** card header with key values (name, length, height)
- **One click to see:** combined dropdown summary (slat/colour/gap in one row)
- **Two clicks to edit:** expand the dropdown, see all options, select one
- **Hidden until needed:** advanced settings, rarely-changed options

### 4. The cascade: run → section → gate
Parent settings cascade to children. Children show green when they match the parent. Only show overrides — don't repeat unchanged settings.

This means the sidebar stays clean for simple jobs (one run, one section = minimal UI) but scales for complex ones (multiple runs with per-section overrides).

## Specific Patterns

### Don't force choices before the user has context
The user doesn't know what settings they want until they see the result. Let them generate a BOM with defaults, then adjust.

**Anti-pattern:** wizard flow (step 1: system type, step 2: colour, step 3: size, step 4: BOM)
**Better pattern:** all settings visible in sidebar, BOM updates live as settings change

### Use the BOM as the feedback loop
The BOM IS the output. Show it alongside the settings. When the user changes a setting, the BOM updates immediately. This creates a tight feedback loop: change → see result → adjust.

### One place to edit each setting
If a setting appears in the card header AND in the expanded dropdown, the user doesn't know which one to edit. Pick one place:
- **Display:** read-only in the header (for at-a-glance scanning)
- **Edit:** in the expanded dropdown (for changing values)

Never put editable inputs in the collapsed/header area.

### Destruction requires confirmation, creation doesn't
- Adding a run/section/gate: instant, one click
- Removing a run/section/gate: two-click safety (ConfirmButton pattern)
- Clearing the job: two-click safety + save-confirm dialog if unsaved changes
- Changing a setting: instant, no confirmation needed (it's non-destructive — can be changed back)

### Visual hierarchy communicates importance
- **Run card:** light blue surround, largest heading
- **Section card:** white/neutral, medium heading, indented under run
- **Gate card:** compact, smallest heading, nested under section
- **Active/selected:** subtle highlight (brand-primary tint)
- **Green match:** small chip, not a banner — it's info, not an action

### Settings that overlap with the display area
Some values appear in both the settings panel and another display area (e.g. corner count in run settings AND in the run details panel below the map). Resolution:
- **If it's derived from geometry:** show it read-only in the display area, remove the editable control from settings
- **If it's user-configured:** show it in settings only, and optionally read-only in the display area
- **Never show the same value as editable in two places**

## Common UX Mistakes in Configurators

1. **Too many dropdowns visible at once.** Use mutual exclusion — only one dropdown open at a time.
2. **No indication of what's default vs customized.** The green match indicator solves this.
3. **Forcing sequential choices.** Let the user jump to any setting in any order.
4. **Settings that don't affect the output.** If a setting doesn't change the BOM, remove it.
5. **Inconsistent patterns across similar panels.** Run, section, and gate settings should use identical formatting.
6. **Forgetting mobile.** Sidebar collapses. Map/BOM takes full width. Settings open as overlays.
