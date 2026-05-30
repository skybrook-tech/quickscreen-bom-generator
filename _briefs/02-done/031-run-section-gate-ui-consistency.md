# 031 — Run/Section/Gate UI consistency overhaul (headings, inline height, settings buttons, dropdown alignment)

Branch: `codex/brief-031-run-section-gate-ui-consistency`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 028 (PR #68) and brief 029 (PR #69) merged — already true on master once you ship them.

Use npm 10.x if package-lock.json needs touching.

## Goal

Bring the Run, Section, and Gate cards into UI consistency on BOTH mobile and desktop. Improve discoverability of settings (gear icons → labeled text buttons), reduce clicks for common edits (inline height editor in headings), and align section settings to match run settings exactly. Make differences visible at-a-glance via diff display in section subheadings.

## What to implement

### A. Run heading — show system type fully written out

1. In the run heading row, after the total length, display the system type using its FULL human-readable name:
   - `QSHS` → "QuickScreen Horizontal Slat"
   - `XPL` → "XPress Plus Premium"
   - `VS` → "Vertical Slat"
   - `BAYG` → "Buy As You Go"

   The mapping should be derived from the system seed files (`src/data/systems/*.json` or wherever the system metadata lives — check files like `qshs.json`, `xpl.json`, `vs.json`, `bayg.json` and pull the `displayName` or `label` field; if no such field exists, add one to each seed file).

2. Typography: the system type appears AFTER the total length, in **smaller and lighter** type so the length stays primary. E.g., visually:
   ```
   Run 1
   5.2m · QuickScreen Horizontal Slat
   ```
   Where "5.2m" is the primary heading text and "· QuickScreen Horizontal Slat" is a smaller, lighter descriptor.

3. Layout: same row (horizontal flex). On narrow viewports (<375px), the system type can wrap to a second line below the length.

### B. Run subheading — show height (editable inline)

4. Remove the system type from the run subheading (it now lives in the heading per A).
5. In the subheading, display the run's default height with an INLINE editor:
   - For horizontal slat systems (QSHS, XPL, BAYG): a **dropdown** populated from the system's allowed heights (e.g., QSHS heights from `qshs.json`)
   - For vertical slat systems (VS): a **number input** allowing custom values (vertical slat heights are panel-width-driven and more flexible)
   - The editor renders INLINE — no popup, no separate Settings panel needed. Tap → focus → change → blur to save.
   - Visual style matches the existing inline editable patterns elsewhere in the app (consistent border, focus state, etc.)

6. When height is changed at the run level, all sections in that run that DO NOT have a section-specific height override inherit the new value.

### C. Section heading — show height (editable inline)

7. In the section card heading, display the section's name (existing) plus the height with the same inline editor pattern from B.
   - Dropdown for horizontal systems, number input for vertical
   - Default to the run's height; editing creates a section-specific override
   - Editing back to the run's default value removes the override (height comes from run again)

### D. Gate heading — show height (editable inline)

8. In the gate card heading, display the gate's name plus the height with the same inline editor pattern.
   - Same dropdown/input rules based on system type
   - Default to the run's height (gates and sections share the run-level default)

### E. Settings buttons — replace gear icons with labeled text buttons

9. Replace ALL three gear icons (Run, Section, Gate settings) with labeled text buttons:
   - **"Run Settings ▾"** — small text, with a small down arrow
   - **"Section Settings ▾"** — same pattern
   - **"Gate Settings ▾"** — same pattern
   - Position: where the gear icon currently sits (right side of the relevant heading row)
   - Size: small (e.g., `text-xs` or `text-sm` in Tailwind), unobtrusive but clearly readable
   - Behavior: same as before — opens the settings dropdown/panel for that scope

### F. Section settings dropdowns — align with Run settings exactly

10. **Audit step**: open both `RunSettings.tsx` and `SectionSettings.tsx` (or equivalent file names — search `src/components/calculator-v3/`). For each, list:
    - The dropdowns present
    - What options each dropdown contains
    - The layout/order of dropdowns

11. **Goal**: Section Settings should have the SAME three dropdowns as Run Settings, in the same order, with the same internal options.

12. **Specific bugs to fix** (these are how the section dropdowns currently differ from run dropdowns):

    Current state (incorrect):
    - Post size dropdown contains: post size, post color, slat range
    - Slats dropdown contains: slats, slat color, finish

    Correct state (matches run settings):
    - **Slats dropdown** (formerly "slats + color"): slats, slat color, slat range — finish REMOVED from here
    - **Post dropdown** (formerly "post size + color + slat range"): post size, post color — color and slat range MOVED out
    - Third dropdown stays mostly the same (gap, gate hardware, components per existing run-settings layout) but with the modification below

13. **Combine gap type + gap size into one dropdown** in BOTH run settings AND section settings:
    - Find where the gap selector currently has separate "gap type" and "gap size" controls
    - Merge into one choice with combined values (e.g., "Aluminum spacer 12mm", "Aluminum spacer 25mm", "Custom 18mm")
    - The combined value should encode both type and size; serialize back into the underlying state model however that's done (a single `gapId` or `gap` object with type + size fields)
    - Apply same change to section settings

14. After the audit + alignment, Section Settings should be a near-mirror of Run Settings. Any difference is a deliberate choice (e.g., a section can override a specific setting), not a UI/UX inconsistency.

### G. Section subheading — show settings that differ from run defaults

15. In the section subheading, display ONLY the settings that override the run's defaults. Format: comma-separated, on a single line, truncated with ellipsis if it overflows.

16. Example: if the run defaults are { slat color: Surfmist, post color: Surfmist, gap: 12mm } and a section overrides { slat color: Charcoal, gap: 25mm }, the section subheading shows:
    ```
    Slat color: Charcoal, Gap: 25mm
    ```
    Post color is NOT shown because it matches the run default.

17. **Empty state**: if no settings differ from the run, show nothing — empty subheading (or hide the subheading element entirely). Don't show "Default" or "Same as run" — empty is the cleanest signal.

18. **Truncation**: on narrow viewports (mobile), if the diff list overflows the available width, truncate with `text-overflow: ellipsis` and `white-space: nowrap`. Users can open Section Settings to see the full picture.

### H. Mobile + desktop parity

19. Every change above applies to BOTH the mobile and desktop UI. Visual styles may differ (mobile is touch-optimized, desktop is denser) but feature parity is non-negotiable.

20. Test BOTH surfaces during implementation. Tabs/breakpoints can be tested in Chrome DevTools (mobile viewport simulator).

## Files likely involved

- `src/components/calculator-v3/RunCard.tsx` or similar (run heading/subheading)
- `src/components/calculator-v3/SectionCard.tsx` (section heading/subheading)
- `src/components/calculator-v3/GateCard.tsx` (gate heading)
- `src/components/calculator-v3/RunSettings.tsx` (run settings dropdowns)
- `src/components/calculator-v3/SectionSettings.tsx` (section settings — needs alignment work)
- `src/components/calculator-v3/GateSettings.tsx` (gate settings)
- `src/data/systems/qshs.json`, `xpl.json`, `vs.json`, `bayg.json` (read for displayName + allowed heights; may need to ADD displayName field if missing)
- Possibly a shared component for the inline height editor: `src/components/calculator-v3/InlineHeightEditor.tsx` (new)
- Tests in `src/components/calculator-v3/`

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- The BOM data model (height field shape, override mechanism, etc.) — only the UI for editing it
- `canonicalAdapter.ts` public function signatures
- `canvasEngine.ts`
- Canvas / drawing functionality (this is a settings UI brief, not a canvas brief)
- The structure of canonical form fields — height storage is unchanged, just the editor UX changes
- `package.json` beyond strictly necessary

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview (mobile + desktop):
  1. **Run heading** shows: name + total length + system type (full name, smaller/lighter)
  2. **Run subheading** shows: editable height (dropdown for QSHS/XPL/BAYG, number input for VS)
  3. **Section heading** shows: section name + editable height (same editor pattern)
  4. **Gate heading** shows: gate name + editable height
  5. **All three settings buttons** are labeled text + down arrow (no gear icons)
  6. **Section Settings dropdowns** match Run Settings exactly (3 dropdowns, same order, same options)
  7. **Gap type + gap size** are now one combined dropdown in both Run and Section settings
  8. **Section subheading** shows comma-separated diff list when settings differ from run; empty when all match
  9. **Editing run height** updates all sections without overrides
  10. **Editing section height** creates an override; setting back to run's value clears the override
- BOM output unchanged for all existing quotes (regression check on a saved test quote)
- All checks pass on BOTH mobile viewport AND desktop viewport

New tests:
- Run heading renders system displayName from seed file
- Inline height editor renders dropdown for QSHS, number input for VS
- Section subheading shows only diffs, empty when no diffs
- "Section Settings" / "Run Settings" / "Gate Settings" buttons render with text + arrow (no gear icon)
- Section Settings has same dropdown structure as Run Settings (snapshot test)
- Combined gap dropdown encodes both type and size correctly

## Manual reproduction (for PR description)

1. Open `npm run dev`, mobile viewport on `/fence-calculator`
2. Create a new run with QSHS system → verify heading shows "QuickScreen Horizontal Slat"
3. Tap height in run subheading → dropdown of allowed heights appears
4. Change height → all sections without overrides update
5. Open a section → change a setting → diff shows in section subheading
6. Tap "Section Settings ▾" → confirm dropdowns match Run Settings layout exactly
7. Repeat for VS system → confirm number input (not dropdown) for height
8. Repeat all on desktop viewport

## Risk

**MEDIUM** — touches many UI components (RunCard, SectionCard, GateCard, RunSettings, SectionSettings, GateSettings) plus possibly system seed files. Risk areas:
- Section settings alignment requires careful audit + refactor. Easy to break edge cases.
- Inline height editor introduces a new shared pattern. Should be one component used in 3 places.
- Gap type + gap size combination changes the underlying state model representation. Need to handle backward compat for existing saved quotes (the deserializer needs to handle both old separate-fields format and new combined-id format).

## Backward compatibility for saved quotes

20. Existing saved quotes have separate `gapType` + `gapSize` fields. The combined dropdown brief above changes the EDITOR, but the data model should still support both:
    - On read: if the quote has separate `gapType` + `gapSize`, infer the combined `gapId`
    - On write: write the new combined `gapId` (or write both forms for transition period)
    - localBomCalculator must continue producing the same BOM for both formats — verify with the existing test quote regression

## Cleanup

21. After this brief lands, if there are unused gear icon imports / now-dead settings dropdown variants, clean them up. Don't leave dead code.
