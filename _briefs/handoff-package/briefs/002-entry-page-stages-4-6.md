# Handoff 002 — Entry page · fence picker + variation form + price bubble

**Depends on:** 001 merged
**Implements:** Stages 4, 5, and 6 of `wireframes/01-entry-page-v3.html`
**Target file:** `src/pages/AnyfenceCalculatorPage.tsx` + new components
**Routes affected:** same as 001

## Goal

After 001, the customer can draw a fence on a captured satellite view. This brief adds everything that happens after: picking the fence type, configuring variations, and seeing the price.

By the end of this PR a customer can:

1. Pick **Timber Paling** from the sidebar → sidebar expands into the variation form
2. Configure variations (Style / Posts / Palings / Rails / Extras) via inline-disclosure pattern
3. See a **floating price bubble** appear in the top-right of the map showing the live total
4. Tap the bubble → it expands to overlay most of the map with the full BOM
5. Toggle between **Supply only** (detailed line items) and **Supply + install** (per-run + per-gate breakdown)
6. The sidebar stays interactive while the bubble is expanded — every variation change moves the BOM

## What to build

### Stage 4 — Fence type picked

When the customer taps Timber Paling in the sidebar:

- **Fence-type list collapses** into a header pill: `← Change fence type`
- **Variation form takes the sidebar** (dark navy background to read as a different mode)
- **Run-recap card** at the top of the sidebar (lifted from QuickScreen's pattern):
  - Title: "Run 1" with linear-metre value in IBM Plex Mono (e.g. "28.4m")
  - Sub: "Timber Paling · Butted · CCA Pine H4"
  - Spec grid (2 columns): Height / Color / Paling / Rail / Post / Mounting / Max spacing / Posts × Gates
  - Bottom row: `+ Add section` / `+ Add gate` / `Remove run` buttons
  - A "Run Settings ▾" toggle that opens the disclosure body below
- **Variation disclosure sections** (each individually expandable, only one open at a time by default):
  - **Style** — Butted / Lapped+capped pill group · Height (1200/1500/1800/2100 mm) pill group
  - **Posts** — Material (CCA Pine H4 / Hardwood) · Size dropdown · Mounting (In-ground / Core-drilled)
  - **Palings** — Width (100/125/150 mm) · Length pill group
  - **Rails** — Size dropdown · Rails per panel
  - **Extras** — Plinth toggle · Nail type toggle
- Collapsed sections show a one-line summary: `Posts · CCA Pine H4 · 100×75 · In-ground`

### Price bubble (collapsed) — top-right of map

Floating soft-edged card, 260px wide, positioned over the map:

- Amazing Fencing "AF" mark + "Amazing Fencing" name
- Tag: "Supply only · inc GST"
- Total in mono (e.g. `$2,606.18`)
- Sub: `ex GST $2,369`
- Chevron `▾` to expand

### Stage 5 — Bubble expanded · Supply only

When tapped, bubble grows to ~460px wide, overlays most of the map:

- Mode toggle: `[Supply only] | [Supply + install]` (Supply only active)
- **Full itemised BOM** grouped by category:
  - **Posts**: canonical name (`100×75 Treated Pine Post H4 2400mm`) + supplier SKU (`amf · CCAH4PST-100-75-2400`) · qty + price
  - **Palings**, **Rails**, **Fasteners + concrete**, **Gates** — same format
- Sticky total band (navy) at the bottom: label + big amount + ex-GST sub
- CTA strip: primary "Book materials pickup · Amazing Fencing →" + secondary "Email this quote to me"
- **Close button (×) top-right** of the bubble collapses it back
- **Sidebar stays fully interactive** on the left — customer can change variations while bubble is open

### Stage 6 — Bubble expanded · Supply + install

When mode flips to Supply + install:

- BOM reshapes into **per-run + per-gate format** (NOT detailed line items):
  - `R1 — Side run · 12.0m boundary fence · $1,148 (supply $720 · install $428)`
  - `R2 — Rear run · 8.4m boundary fence · $748 (...)`
  - `R3 — Side run · 12.0m boundary fence · $1,098 (...)`
  - `G1 — Gate 1 · 900mm pedestrian · $498 (supply $355 · install $143)`
  - `G2 — Gate 2 · 1500mm double · $754 (...)`
- Sub-section: **Site labour + extras**
  - Old fence removal + tip · $240
  - Site travel · 14 km from depot · $120
- Optional expander row: "Show every item · canonical names + SKUs" — hidden behind a click
- Total band: "Supply + install · inc GST · $4,608"
- CTA: "Book this job · 2 day install →"

## Engine binding

This brief is where the BOM engine actually gets called. Wire `useBomCalculator` (or successor) to:

1. Compose a canonical payload from the run + variations
2. Call the BOM engine (Supabase `bom-calculator` edge function or, if you're using the build-pack engine, the new endpoint that wraps `treated-pine-paling-fence-calculator/calculator.py`)
3. Render the response as either detailed BOM (Supply only) or per-run breakdown (Supply + install)

The canonical-name contract is in `reference/canonical-name-contract.md`. **Never invent or rename a canonical name.** If the engine returns one that isn't in the contract, surface a warning — don't silently render.

## Files to modify / create

- `src/pages/AnyfenceCalculatorPage.tsx` — wire in the new flow
- New: `src/components/calculator/RunRecapCard.tsx` — the top-of-sidebar summary card
- New: `src/components/calculator/VariationDisclosure.tsx` — inline-disclosure variation form
- New: `src/components/calculator/PriceBubble.tsx` — collapsed + expanded states, mode toggle, BOM rendering
- `src/components/calculator-v3/RunListV3.tsx` — likely replace or augment with the new pattern
- `src/components/calculator-v3/RunSettingsEditor.tsx` — repurpose the variation-form rendering logic
- `src/hooks/useBomCalculator.ts` — confirm it works with the new payload shape

## Files NOT to modify

See `reference/protected-paths.md`. Same list as Brief 001.

## Acceptance criteria

1. After Brief 001, draw a fence on the map → tap Timber Paling in the sidebar
2. Sidebar transitions to variation form (dark navy background)
3. Run-recap card shows live linear-metre total + spec summary
4. Variation disclosure sections expand/collapse on tap
5. Price bubble appears top-right of map with collapsed state (logo + total + chevron)
6. Tap bubble → expands to ~460px wide
7. Expanded bubble shows Supply only mode with full itemised BOM (canonical names + supplier SKUs)
8. Flip mode toggle → BOM reshapes to per-run + per-gate format
9. Close button collapses the bubble; sidebar stays interactive throughout
10. Total updates within 500ms of any variation change

## Test to add

`cypress/e2e/anyfence_entry_pricing.cy.js` — extending the smoke test from 001 with the fence-picker + variation + price-bubble flow.

## What's deliberately out of scope

- Booking flow (Brief 003)
- Other fence types beyond Timber Paling (separate brief)
- "Build from scratch" path (separate brief)
- Mobile layout (separate brief)

## Reference

- Wireframe: `wireframes/01-entry-page-v3.html` — Stages 4, 5, 6
- Canonical name contract: `reference/canonical-name-contract.md`
- BOM math engine: `anyfence-build-pack/skills/calculator-engine/treated-pine-paling-fence-calculator/calculator.py`
- Protected paths: `reference/protected-paths.md`
