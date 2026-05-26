# 030 — Fix Roadmap layer not rendering on the canvas (mobile + desktop)

Branch: `codex/brief-030-canvas-roadmap-layer-fix`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 028 (PR #68) merged. The canvas refinement work needs to be on master first so we don't merge-conflict on canvas files.

Use npm 10.x if package-lock.json needs touching.

## Goal

The canvas drawing surface supports multiple map layers (Satellite + Roadmap) with independent toggles in the Layers panel/bottom-sheet. Currently the **Roadmap layer does not render** when toggled on — neither on mobile nor on desktop. Satellite layer renders fine; only Roadmap is broken.

Fix the rendering so:
- Satellite layer continues to work as it does today
- Roadmap layer ACTUALLY appears on the canvas when its toggle is enabled
- Both layers can be visible at the same time (satellite underneath, roadmap on top with the configured opacity)
- Toggling each layer on/off behaves predictably

## Investigation steps (do these first, then fix)

1. **Find the layers panel** — search `src/components/` for files containing "Layers", "Satellite", "Roadmap", "MapLayer", or "layerToggle". Likely candidates: `FenceLayoutCanvas.tsx`, a `LayersPanel.tsx` / `LayersSheet.tsx` component, or wherever the bottom-sheet on mobile lives.

2. **Find the layer state** — locate the state object/store holding `satellite`/`roadmap` visibility + opacity. Likely a `useState` or Zustand atom with shape like:
   ```ts
   {
     satellite: { visible: true, opacity: 1.0 },
     roadmap: { visible: false, opacity: 0.5 }
   }
   ```

3. **Find the layer rendering** — locate WHERE the canvas actually draws the satellite and roadmap images. Look for:
   - `<img>` tags with map URLs
   - `ctx.drawImage()` calls in `canvasEngine.ts`
   - Maps Static API URL constructions in `staticSnapshot.ts`

4. **Diagnose the bug**. Likely causes (test each):
   - **A. Roadmap URL is never constructed.** The captured snapshot from "Use this view" is a single hybrid image. The Roadmap layer expects a SEPARATE Maps Static API URL with `maptype=roadmap` (no satellite). Check if this URL is ever built.
   - **B. Roadmap rendering code path was removed/disabled.** Maybe a previous brief commented it out or replaced it.
   - **C. Roadmap image is loading but rendering at zero opacity/zero size/wrong z-index.** Inspect the rendered element in DevTools — is the `<img>` in the DOM but invisible?
   - **D. Toggle state mutates but rendering reads from a different state variable.** Toggle writes to `state.roadmap.visible` but render reads from `state.showRoadmap` (or similar mismatch).
   - **E. Roadmap URL is broken** (e.g., wrong API parameters, expired styling syntax).

   Use Chrome DevTools on the deploy preview to inspect what's actually in the DOM when Roadmap toggle is enabled vs disabled.

5. **Document the root cause in the PR description** so we know what was broken.

## What to implement

After diagnosis, implement the fix:

### A. Ensure Roadmap layer has its own Maps Static URL

The Roadmap layer URL should be built from the same center/zoom as the Satellite layer but with different parameters:
- `maptype=roadmap` (NOT hybrid, NOT satellite — pure roadmap with no satellite imagery)
- Same `center`, `zoom`, `size`, `scale` as the satellite snapshot
- Apply the SAME decluttering style params from brief 029 (so it matches the visual style)
- Optionally: `&style=feature:landscape|element:geometry.fill|color:0xffffff` to whiten the landscape so the roadmap reads cleanly

Add the Roadmap URL construction next to the existing Satellite URL builder in `src/lib/googleMaps/staticSnapshot.ts`.

### B. Render the Roadmap layer on the canvas

Find where Satellite is rendered (likely an `<img>` element layered absolutely positioned inside the canvas container). Add a parallel `<img>` for Roadmap:

```tsx
{layers.satellite.visible && (
  <img 
    src={satelliteSnapshotUrl} 
    style={{ position: 'absolute', opacity: layers.satellite.opacity, zIndex: 1 }} 
    alt="satellite" 
  />
)}
{layers.roadmap.visible && (
  <img 
    src={roadmapSnapshotUrl} 
    style={{ position: 'absolute', opacity: layers.roadmap.opacity, zIndex: 2 }} 
    alt="roadmap" 
  />
)}
```

The drawing layer (where fence runs render) should be `zIndex: 10` or higher so it's always on top.

### C. Wire the toggle to the rendering state correctly

Audit the layer toggle UI:
- The Layers panel (mobile bottom sheet at ~45dvh per brief 021's fix-up, or desktop sidebar layers control) should have:
  - "Satellite" checkbox + opacity slider
  - "Roadmap" checkbox + opacity slider
  - Optional master "Map on/off" toggle that turns BOTH off in one tap (per the earlier "map off button" feedback)
- Each toggle writes to the layer state used by the rendering above
- No state mismatch between toggle and render

### D. Mobile vs desktop parity

This bug appears on both mobile and desktop. Fix should work in both:
- Mobile: layers bottom-sheet (already at ~45dvh from brief 021's fix-up)
- Desktop: layers panel in the sidebar or as a popover from a toolbar button
- Same toggle behavior, same rendering code path. No duplicate state.

### E. Snapshot capture flow

When user taps "Use this view" in the property map sidebar, the captured snapshot becomes the Satellite layer. Currently this is a hybrid image (after brief 025). Consider whether to:
- **Option 1**: Keep hybrid for the Satellite snapshot (the captured image has labels already)
- **Option 2**: Switch the "Use this view" capture to `maptype=satellite` (no labels), and let the Roadmap layer provide the labels
- **Option 3**: Capture BOTH satellite AND roadmap images at the same time when user taps "Use this view"

**Pick Option 3** — capture both layer images in parallel when "Use this view" is tapped. Store both URLs. The user then has independent control over each layer.

Update the "Use this view" handler to:
```ts
async function captureBothLayers(center, zoom, scale) {
  const satelliteUrl = buildStaticMapUrl({ center, zoom, scale, maptype: 'satellite' });
  const roadmapUrl = buildStaticMapUrl({ center, zoom, scale, maptype: 'roadmap' });
  const [satellite, roadmap] = await Promise.all([
    cropAttribution(satelliteUrl, scale),
    cropAttribution(roadmapUrl, scale),
  ]);
  return { satellite, roadmap };
}
```

## Files likely involved

- `src/components/canvas/FenceLayoutCanvas.tsx` (layer rendering)
- `src/components/canvas/canvasEngine.ts` (layer state, render pipeline)
- `src/components/canvas/CanvasToolbar.tsx` or wherever the layers button lives
- `src/components/canvas/LayersPanel.tsx` / `LayersSheet.tsx` (toggle UI — name TBD)
- `src/lib/googleMaps/staticSnapshot.ts` (URL builders for satellite + roadmap)
- `src/lib/googleMaps/staticSnapshot.test.ts` (extend tests)

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts` public function signatures
- The drawing layer (fence rendering must stay on top of all map layers)
- Brief 025's hybrid map type in the SIDEBAR property map (that's separate from the canvas Roadmap layer)
- The decluttering style params from brief 029 (Roadmap should USE them too)
- The attribution crop from brief 029 (apply to both Satellite AND Roadmap captures)
- `package.json` beyond strictly necessary

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview (mobile + desktop):
  1. Open `/fence-calculator`, capture map with "Use this view", enter canvas
  2. Open Layers panel/sheet
  3. **Roadmap toggle ON** → roadmap layer renders on top of (or instead of) satellite
  4. **Roadmap toggle OFF** → roadmap layer disappears
  5. **Both toggles ON** → both visible, with opacity sliders controlling each independently
  6. **Both toggles OFF** → drawing surface shows blank background (or whatever the bare canvas state is)
  7. Adjust Roadmap opacity slider → visible opacity changes in real time
  8. Roadmap labels are decluttered (no business POIs, no transit, no minor roads) per brief 029 style
  9. Roadmap image has NO Google attribution strip (cropped per brief 029)
- Desktop: same behavior as mobile
- No regression in Satellite layer rendering
- No regression in fence drawing (fence runs still appear above all map layers)

New tests:
- Roadmap layer renders when `layers.roadmap.visible === true`
- Roadmap layer hides when `layers.roadmap.visible === false`
- Both layers can be visible simultaneously
- Roadmap URL includes the decluttering style params from brief 029
- Roadmap URL goes through the same attribution crop path as Satellite

## Manual reproduction (for PR description)

1. Open `npm run dev`, mobile viewport on `/fence-calculator`
2. Enter address, capture map, enter canvas
3. Open Layers sheet → toggle Roadmap on → confirm visible on canvas
4. Toggle Satellite off → confirm only Roadmap visible
5. Both off → blank canvas
6. Repeat on desktop browser

## Risk

**MEDIUM** — touches canvas layer rendering, which is the same area as briefs 020/021/028. Mitigations:
- Investigation step required before changes (document root cause)
- Tests for both layer states + opacity
- localBomCalculator unchanged guarantee
- Falls back gracefully if roadmap URL fails to load (use existing error handling)

If diagnosis reveals the architecture needs a bigger refactor (e.g., the layer state is fundamentally broken across multiple components), STOP and report — don't improvise. Move brief to `03-paused/` with a detailed write-up of what's wrong, so Liam can decide how to scope the fix.
