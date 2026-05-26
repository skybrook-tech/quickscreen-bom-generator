# 029 — Property map: declutter labels + crop Google attribution from snapshot

Branch: `codex/brief-029-property-map-label-and-attribution-crop`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 025 (PR #64) merged. Brief 025 changed the map type to hybrid; this brief builds on that.

Use npm 10.x if package-lock.json needs touching.

## Goal

Two refinements to the property map work shipped in brief 025:

1. **Map labels look cluttered** — hybrid map type shows lots of labels (road names, transit, businesses, POIs) and many overlap/look too big on the small sidebar map. Apply Maps Static API style parameters to hide noise and keep critical info readable.
2. **Crop Google attribution strip from the snapshot** — when "Use this view" transfers the map image to the canvas drawing surface, the Google copyright/attribution text appears at the bottom of the image (~22px strip). Crop it out so the canvas drawing surface is clean.

## What to implement

### A. Declutter Maps Static API labels

1. Locate the Maps Static URL builder in the repo. After brief 025, this is likely `src/lib/googleMaps/staticSnapshot.ts` (Codex's brief 025 PR edited that file).

2. Add style parameters to the URL. Recommended starting style set — hide local roads, transit, businesses, POIs, water labels, and lighten arterial road labels:

```ts
// At the top of the URL builder file:
const STATIC_MAP_STYLE_PARAMS = [
  'feature:road.local|element:labels|visibility:off',
  'feature:road.arterial|element:labels|lightness:30',
  'feature:transit|visibility:off',
  'feature:poi.business|visibility:off',
  'feature:poi.attraction|visibility:off',
  'feature:poi.park|element:labels|visibility:off',
  'feature:water|element:labels|visibility:off',
].map(s => `&style=${encodeURIComponent(s).replace(/'/g, '')}`).join('');
```

3. Append `STATIC_MAP_STYLE_PARAMS` to the constructed URL after the existing parameters:

```ts
return `https://maps.googleapis.com/maps/api/staticmap?center=${...}&zoom=${...}&maptype=hybrid&size=${...}&key=${...}${STATIC_MAP_STYLE_PARAMS}`;
```

4. **Validation**: paste the constructed URL into a browser. The map should render. If the API returns a 400 error, simplify the style list until you find which entry is the offender.

5. **Caveat**: Maps Static API style syntax is finicky. The `|` separator inside the style value should NOT be URL-encoded (it must remain as `|`). The `:` inside the value also should NOT be encoded. The encoding shown above strips quotes; double-check by hand that the final URL has readable style strings.

### B. Client-side crop of the Google attribution strip from the captured snapshot

6. Locate the "Use this view" snapshot capture flow. After brief 025, the capture function likely lives in `src/lib/googleMaps/staticSnapshot.ts` or is called from the PropertyMap component.

7. Add a `cropAttribution` helper:

```ts
/**
 * Strip Google's attribution band from the bottom of a Maps Static API snapshot.
 * The strip is ~22px tall at scale=1 and ~44px at scale=2.
 */
export async function cropAttribution(srcUrl: string, scale: 1 | 2 = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const stripHeight = 22 * scale;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = Math.max(1, img.naturalHeight - stripHeight);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load map image for crop'));
    img.src = srcUrl;
  });
}
```

8. In the "Use this view" handler, replace the direct URL transfer with a crop call:

```ts
// Before:
const snapshotUrl = buildStaticMapUrl(center, zoom);
onCapture(snapshotUrl);

// After:
const snapshotUrl = buildStaticMapUrl(center, zoom);
const croppedDataUrl = await cropAttribution(snapshotUrl, scale);
onCapture(croppedDataUrl);
```

9. **CORS note**: Maps Static API responses include CORS headers that allow `crossOrigin="anonymous"` for canvas reading. If this fails in practice (look for "tainted canvas" errors), fall back to fetching via `fetch()` → `blob()` → `createImageBitmap()` → draw to canvas:

```ts
async function cropAttributionFallback(srcUrl: string, scale: 1 | 2 = 1): Promise<string> {
  const res = await fetch(srcUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const stripHeight = 22 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = Math.max(1, bitmap.height - stripHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL('image/png');
}
```

10. **Loading state**: cropping happens async. Show a brief loading indicator on the "Use this view" button while the crop runs (typically <500ms). After resolve, transfer the data URL to the canvas as before.

11. **Error handling**: if crop fails (CORS, network, etc.), fall back to using the uncropped URL with a console.warn — better to ship the image with attribution than to fail the capture entirely.

## Files likely involved

- `src/lib/googleMaps/staticSnapshot.ts` (primary — URL builder + crop helper)
- `src/lib/googleMaps/staticSnapshot.test.ts` (extend with tests for style params and crop)
- `src/components/calculator/PropertyMap.tsx` (the "Use this view" button handler)
- Possibly a hook like `src/hooks/useGoogleMaps.tsx`

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts`
- `canvasEngine.ts`
- Anything outside the property map / static snapshot files
- The address autocomplete behavior
- The hybrid map type setting from brief 025 (keep it as hybrid)
- `package.json` beyond strictly necessary

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview:
  1. Open `/fence-calculator`, enter an address
  2. **Map shows fewer labels** — major roads + addresses + general areas labeled, but minor roads / businesses / transit are hidden or de-emphasized
  3. Tap "Use this view" → captured image transfers to the canvas
  4. **Captured image has NO Google attribution text** at the bottom — the canvas drawing surface is clean
  5. The captured image dimensions are the original height minus ~22px (or 44px at 2x scale)
- Confirm the cropped image still includes the full property area at the top (no top-pixel loss)

New tests:
- `STATIC_MAP_STYLE_PARAMS` constant is appended to the URL
- `cropAttribution` reduces canvas height by 22px at scale=1 (mock the Image load, assert canvas dimensions)
- `cropAttribution` reduces height by 44px at scale=2
- Crop fallback returns the uncropped URL on error (so capture never fully fails)

## Manual reproduction (for PR description)

1. Open `npm run dev`, mobile viewport, `/fence-calculator`
2. Enter address: "1 Sydney Opera House, Sydney"
3. Verify map shows hybrid view with reduced label density (main roads + addresses, no business names)
4. Tap "Use this view"
5. Verify canvas underlay has the satellite imagery with NO "©2026 Google" / attribution text at the bottom

## Risk

**LOW-MEDIUM** — touches the Maps Static URL + snapshot capture path. Mitigations:
- Style parameters are appended; can be removed/reverted easily if they cause API errors
- Crop helper has a fallback path (use uncropped URL on error)
- Existing snapshot tests should continue passing
- localBomCalculator unchanged guarantee

## Cache-bust note

Older snapshots captured BEFORE this brief merged will still have the attribution at the bottom (they're stored data URLs). New captures will be clean. If Liam wants to re-capture old saved jobs to clean them up, that's a manual user action.
