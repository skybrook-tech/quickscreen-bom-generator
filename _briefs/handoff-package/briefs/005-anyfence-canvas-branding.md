# Handoff 005 — Anyfence canvas branding (watermark + corner pill)

**Depends on:** 001 merged
**Implements:** the Anyfence platform branding on the captured canvas (Stages 3-6 of `wireframes/01-entry-page-v3.html`)
**Effort:** ~1-2 hours; this is polish

## Goal

Add two subtle Anyfence platform identifiers to the canvas — visible enough to brand it, quiet enough not to compete with Amazing Fencing's primary branding.

1. **Big faint watermark** in the centre of the canvas — "anyfence" in display weight, white at 7% opacity, rotated −6°
2. **Corner pill bottom-right** — small white pill with ember "A" mark + "Anyfence" wordmark + tiny "Platform" tag

## What to build

### Watermark (centre of canvas)

CSS:
```css
.anyfence-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 2;  /* above the map, below all controls */
  overflow: hidden;
}
.anyfence-watermark__text {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 132px;
  letter-spacing: -0.04em;
  color: white;
  opacity: 0.07;
  text-transform: lowercase;
  transform: rotate(-6deg);
  line-height: 1;
  user-select: none;
  white-space: nowrap;
}
```

DOM stub (added in Brief 001):
```html
<div class="anyfence-watermark">
  <div class="anyfence-watermark__text">anyfence</div>
</div>
```

### Corner pill (bottom-right)

CSS:
```css
.anyfence-corner {
  position: absolute;
  bottom: 14px;
  right: 14px;
  z-index: 5;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--line-2);
  padding: 6px 10px 6px 7px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  backdrop-filter: blur(6px);
}
.anyfence-corner__mark {
  width: 18px; height: 18px;
  background: var(--ember);
  color: white;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: -0.04em;
}
.anyfence-corner__word {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.anyfence-corner__tag {
  font-size: 9px;
  color: var(--ink-3);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
  padding-left: 7px;
  border-left: 1px solid var(--line);
}
```

DOM:
```html
<div class="anyfence-corner">
  <div class="anyfence-corner__mark">A</div>
  <div class="anyfence-corner__word">Anyfence</div>
  <div class="anyfence-corner__tag">Platform</div>
</div>
```

## Where to render

Both elements live INSIDE the `.af-canvas` container — same level as the satellite map, drawing toolbar, etc. They appear on Stages 3, 4, 5, and 6 of the entry-page wireframe (anywhere the captured canvas is shown).

**They do NOT appear on:**
- Stage 1 (landing — different layout, no captured canvas yet)
- Stage 2 (live Google Maps — Google's own branding takes precedence; adding Anyfence on top is presumptuous over Google's tiles)

## Conditional rendering

```tsx
{capturedView && (
  <>
    <div className="anyfence-watermark">
      <div className="anyfence-watermark__text">anyfence</div>
    </div>
    <div className="anyfence-corner">
      <div className="anyfence-corner__mark">A</div>
      <div className="anyfence-corner__word">Anyfence</div>
      <div className="anyfence-corner__tag">Platform</div>
    </div>
  </>
)}
```

Where `capturedView` is the state set true after the customer hits "Use this view".

## Files to modify

- `src/components/calculator/MapCapture.tsx` (or whichever component renders the captured canvas) — add the watermark + corner divs
- `src/index.css` or a new `src/components/calculator/AnyfenceCanvasBranding.module.css` — add the CSS rules

## Files NOT to modify

See `reference/protected-paths.md`.

## Acceptance criteria

1. Draw a fence on the captured canvas → both watermark and corner pill are visible
2. Watermark is large (132px), faint (7% opacity), rotated -6°, centred
3. Corner pill is bottom-right, soft shadow, 88% opacity, doesn't overlap price bubble (top-right) or other controls
4. Watermark stays beneath all interactive elements (z-index 2)
5. Corner pill is above the map but below the price bubble (z-index 5)
6. On Stage 2 (live Google Maps) — NEITHER element is visible
7. On Stages 3-6 (captured + drawn) — BOTH are visible
8. Print Map (from the actions menu) shows the watermark + corner in the print output

## What's deliberately out of scope

- A toggle to hide the watermark (it's always on)
- Customising the watermark per supplier (it's always "anyfence")
- The watermark on the supplier-embedded calculator at `/s/{supplier_slug}/calculator/{instance_slug}` (separate brief — that surface might want different branding)

## Reference

- Wireframe: `wireframes/01-entry-page-v3.html` — visible in Stages 3-6
- Brand colours: ember `#DD6E1B`, navy `#0F2942`
