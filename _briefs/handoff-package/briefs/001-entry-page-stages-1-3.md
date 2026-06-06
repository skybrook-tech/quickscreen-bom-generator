# Handoff 001 — Entry page · landing + live map + capture + drawing toolbar

**Depends on:** nothing (start here)
**Implements:** Stages 1, 2, and 3 of `wireframes/01-entry-page-v3.html`
**Target file:** `src/pages/AnyfenceCalculatorPage.tsx` (replace body)
**Routes affected:** `/`, `/fence-calculator`, `/calculator`

## Goal

Rip out the V3-renamed god-page that currently sits at `AnyfenceCalculatorPage.tsx` and replace it with a clean three-stage entry experience matching the wireframe. By the end of this PR a new customer can:

1. Land on the page with Amazing Fencing branding + an address input over a zoomed-out Australia satellite background
2. Enter an address → see the property in a fully-interactive Google Maps view (zoom, pan, satellite/roadmap toggle)
3. Click "Use this view" → the snapshot locks into a static canvas with the drawing toolbar lit up

**No variation form, no price bubble, no booking — those are Brief 002 and 003.** This brief is just the shell.

## What to build

### Stage 1 — Landing
- Anyfence's existing brand stays in the page header (`AppShell`) but reorder: **Amazing Fencing logo + name PRIMARY**, then a thin "Powered by Anyfence" platform strip.
- Full-bleed map background showing Australia at continent zoom (use Google Maps initialized at a very wide zoom centred on AU, or a styled SVG placeholder if rate-limiting is a concern).
- Centred overlay card containing:
  - Amazing Fencing logo (large)
  - One-line value prop: "Get an accurate fence quote in under 2 minutes."
  - Address input field (Google Places autocomplete, AU-only filter)
  - Primary CTA: "Find my property"
  - **Secondary skip-link below the input**: "Skip the map · draw on a blank canvas instead"

### Stage 2 — Live Google Maps + "Use this view"
- Once the address geocodes, the overlay disappears and the map zooms to the property (default ~19, but allow native Google interaction)
- Show **native Google Maps controls only**: zoom +/-, satellite/map toggle (Google's own switcher), tilt, rotate
- Top-right pill: "Live Google Maps" with pulsing green dot (CSS animation; the existing live-tag style in the wireframe is the reference)
- Top-centre: pinned address bar with ✓ confirm
- **Bottom-centre primary CTA**: "Use this view" ember-orange button with sub-label "locks this view into your canvas"
- No Anyfence drawing toolbar appears yet
- Customer can pan, zoom, switch satellite/roadmap — all interactive

### Stage 3 — View captured + drawing toolbar
The moment "Use this view" fires:
- Google interactivity FREEZES — capture a snapshot (via `google.maps.Map.takeScreenshot()` or rendered to canvas)
- "Live" pulse pill replaces with a "🔒 Captured · drawing-ready" pill (top-LEFT now; top-right is for the actions menu)
- **Drawing toolbar appears** across the top of the canvas in two groups:
  - **DRAW**: Draw Fence (D), Gate (G), Move/Edit (E), Undo, Redo, Clear
  - **SITE**: Dotted line (B), Arrow (A), Building (U), Free Draw (F + colour/width/style/opacity sub-controls), Existing post (P), Pillar (I), Text (T), **Photo pin (O)** ★ new, **Tree (R)** ★ new, **North arrow (N)** ★ new
- **Compact actions menu top-right** (small white-pill stack):
  - Centre (C) — fit-to-content
  - Print Map (P)
  - Reset View
  - Drawing to screen (F) — fullscreen canvas (was "Expand" in QuickScreen)
- **Sidebar appears on the LEFT** with the fence-type list:
  - Step indicator: "Step 2 — Draw your fence" (or step 3 if address-confirmed sub-step exists)
  - **Available now**: Timber Paling (with thumbnail)
  - **Coming soon** (disabled, "SOON" badge): Colorbond, Aluminium slat, Pool glass, Picket
- No price bubble, no variation form yet (Brief 002)

### The three approved new tools (★)

| Tool | Hotkey | Behaviour |
|------|--------|----------|
| **Photo pin** | `O` | Tap a spot → opens file picker / camera → drops a photo marker at that location. Photo stays in the layout payload, viewable on hover, can be tapped to enlarge. Installer sees these before quote acceptance. |
| **Tree** | `R` | Tap a spot → drops a circle marker (~3m diameter in real-world scale). Customer can resize. Marks trees that affect fence runs. |
| **North arrow** | `N` | Tap once → auto-places a compass marker. Bearing pulled from `google.maps.Map.getHeading()` (snapshot at capture time). Customer can drag to a clear spot on the map. |

### Stripped tools (DO NOT include)

These were in earlier drafts but are explicitly OUT of this brief: Measure (ruler), Council setback line, Vehicle turning circle, Satellite layer opacity slider, Roadmap layer opacity slider, Angle snap, Gate snap 100mm, Show grid. The customer's view is captured and locked — those controls are redundant.

### Anyfence canvas branding

The watermark + corner pill is a separate brief (005), but stub the DOM containers in this brief so 005 can drop in styling without touching the layout. See `reference/anyfence-canvas-branding.md`.

## Files to modify

- `src/pages/AnyfenceCalculatorPage.tsx` — gut the body, replace with the Stages 1-3 layout
- `src/components/calculator-v3/` — wire in or replace `LayoutCanvasV3` with the new map-first behaviour. Or scaffold a `calculator-v4/EntryPage/` if v3 is too entangled.
- `src/components/canvas/MapControls.tsx` — extend for the "Use this view" snapshot trigger if not already present
- `src/components/canvas/CanvasToolbar.tsx` — add the three new tools to the SITE group; remove the actions buttons (Centre / Print Map / Reset View / Drawing to screen) from inline and move them to a separate `MapActionsMenu` component pinned top-right
- New component: `src/components/calculator/MapCapture.tsx` — handles the "Use this view" snapshot flow
- New component: `src/components/calculator/FenceTypeSidebar.tsx` — the left sidebar with fence-type cards (Timber Paling enabled; rest "coming soon")

## Files NOT to modify

See `reference/protected-paths.md`. Specifically for this brief:
- `src/lib/localBomCalculator.ts` (BOM regression guard)
- `src/lib/localBomCalculator.test.ts` (must pass unchanged)
- `src/components/canvas/canonicalAdapter.ts` (public signatures stable)
- `src/components/canvas/canvasEngine.ts` (public types stable)

## Acceptance criteria

A reviewer should be able to:

1. Open `/fence-calculator` and see the Amazing Fencing landing screen (no Glass Outlet content anywhere visible)
2. Type "9 Mogo Pl Billinudgel" → autocomplete → click "Find my property" → see the live Google Maps view with native controls
3. Pan / zoom / toggle satellite-vs-map — all responsive
4. Click "Use this view" → see the snapshot lock, the toolbar appear, the sidebar slide in
5. Click each of the 13 drawing tools (including Photo pin, Tree, North) — each one activates and the canvas cursor changes appropriately
6. Click each of the 4 actions (Centre, Print Map, Reset View, Drawing to screen) — each one fires appropriately
7. The Anyfence platform strip in the header reads "Powered by Anyfence" — small, secondary
8. The Amazing Fencing logo + name is the dominant brand
9. Lighthouse mobile score ≥ 80 (we'll polish in a separate brief, but the bones should be sound)
10. Cypress smoke test passes — see `cypress/e2e/anyfence_entry_smoke.cy.js` (you'll add this)

## Test to add

`cypress/e2e/anyfence_entry_smoke.cy.js`:

```js
describe('Anyfence entry page — Stages 1-3', () => {
  beforeEach(() => cy.visit('/fence-calculator'));

  it('shows Amazing Fencing brand, not Glass Outlet', () => {
    cy.contains('Amazing Fencing').should('be.visible');
    cy.contains('Glass Outlet').should('not.exist');
    cy.contains('Powered by Anyfence').should('be.visible');
  });

  it('shows skip-link under the address input', () => {
    cy.contains('Skip the map').should('be.visible');
  });

  it('lights up the drawing toolbar after Use this view', () => {
    cy.get('input[type="text"]').type('Sydney NSW{enter}');
    cy.contains('Use this view').click();
    cy.contains('Draw Fence').should('be.visible');
    cy.contains('Photo pin').should('be.visible'); // new tool
    cy.contains('Tree').should('be.visible');      // new tool
    cy.contains('North').should('be.visible');     // new tool
  });
});
```

## What's deliberately out of scope for this brief

- The variation form / fence configuration (Brief 002)
- The floating price bubble (Brief 002)
- The booking flow (Brief 003)
- The "Skip the map → blank canvas" follow-through (separate brief)
- Mobile layout breakpoints (separate brief)
- The Anyfence watermark + corner pill (Brief 005, but stub the DOM)

## Reference

- Wireframe: `wireframes/01-entry-page-v3.html` — Stages 1, 2, 3
- Drawing toolbar inventory: `reference/drawing-toolbar-inventory.md`
- Protected paths: `reference/protected-paths.md`
- Amazing Fencing context: `reference/amazing-fencing-context.md`
