# 027 — Fix PWA app icon (replace wrong save-icon-styled PNGs with correct Glass Outlet symbol)

Branch: `codex/brief-027-pwa-icon-fix`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 023 (PR #58) merged — already true on master.

Use npm 10.x if package-lock.json needs touching.

## Goal

The current PWA app icon on master is visually wrong — the deployed PNG files at `public/icons/glass-outlet-symbol-{192,512}.png` and `public/icons/apple-touch-icon.png` are actually save-icon-style imagery (three squares with a download arrow corner), NOT the plain Glass Outlet symbol (three cleanly cascading outlined squares with no arrow).

This happened because the source PNG passed in the original brief 019 asset bundle was misidentified as the Glass Outlet symbol when it was actually a save-icon variant. The corrected PNG files are now in `_briefs/assets/` with the same filenames, generated from hand-coded SVG geometry of three cascading squares with proper z-ordering.

## What to implement

### Step 0 — Pre-flight verification

Confirm the corrected assets exist:

```bash
test -f _briefs/assets/glass-outlet-symbol-192.png && \
  test -f _briefs/assets/glass-outlet-symbol-512.png && \
  test -f _briefs/assets/apple-touch-icon.png && \
  echo "Assets OK" || echo "MISSING — pause this brief"
```

If any are missing → move brief to `03-paused/` and report. The corrected assets ship with this brief's batch — Liam should have committed them when adding the brief files.

### Step 1 — Replace the wrong PWA icon files

1. Copy the corrected files from `_briefs/assets/` to `public/icons/`, overwriting the wrong ones:

```bash
cp _briefs/assets/glass-outlet-symbol-192.png public/icons/glass-outlet-symbol-192.png
cp _briefs/assets/glass-outlet-symbol-512.png public/icons/glass-outlet-symbol-512.png
cp _briefs/assets/apple-touch-icon.png public/icons/apple-touch-icon.png
```

2. Stage them: `git add public/icons/glass-outlet-symbol-192.png public/icons/glass-outlet-symbol-512.png public/icons/apple-touch-icon.png`

3. **No changes to manifest.webmanifest needed** — it already references these filenames correctly.

4. **No changes to index.html needed** — the `<link rel="apple-touch-icon">` already points at the right path.

### Step 2 — Verify the icons are valid PWA icons

5. Open each new PNG with the `file` command or PIL and confirm:
   - 192x192 PNG, mode RGB or RGBA
   - 512x512 PNG
   - 180x180 PNG (apple-touch-icon)
6. Confirm file sizes are reasonable (between 500 bytes and 50KB each — these are simple geometric icons; large files indicate a generation error).

### Step 3 — Update / extend the existing manifest test

7. Brief 023 added `src/lib/manifestAssets.test.ts` which validates manifest/head icon references. Extend it (or add a new test file `src/lib/manifestAssets.icons.test.ts`) to also validate:
   - The icon files at `public/icons/glass-outlet-symbol-192.png` exists and is 192×192
   - Same for 512×512
   - Same for apple-touch-icon.png at 180×180

Use the `image-size` npm package if it's already in deps; otherwise read the PNG header bytes manually (PNG IHDR chunk at byte offset 16-24 contains the dimensions).

If `image-size` isn't available, here's a minimal Node.js / vitest approach using only fs:

```typescript
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

function pngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  // PNG IHDR chunk: width is bytes 16-19 (big endian), height is bytes 20-23
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('PWA icon files', () => {
  it('glass-outlet-symbol-192.png is 192x192', () => {
    expect(pngDimensions('public/icons/glass-outlet-symbol-192.png')).toEqual({ width: 192, height: 192 });
  });
  it('glass-outlet-symbol-512.png is 512x512', () => {
    expect(pngDimensions('public/icons/glass-outlet-symbol-512.png')).toEqual({ width: 512, height: 512 });
  });
  it('apple-touch-icon.png is 180x180', () => {
    expect(pngDimensions('public/icons/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });
});
```

## Files involved

- `public/icons/glass-outlet-symbol-192.png` (overwritten)
- `public/icons/glass-outlet-symbol-512.png` (overwritten)
- `public/icons/apple-touch-icon.png` (overwritten)
- `src/lib/manifestAssets.icons.test.ts` (new) OR extension to `manifestAssets.test.ts`

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts`
- `canvasEngine.ts`
- `public/manifest.webmanifest` (already correct)
- `index.html` (already correct)
- The bundled assets in `_briefs/assets/` (use them as-is — they were generated correctly)
- `package.json` unless adding `image-size` is strictly necessary (avoid — the manual PNG header approach works)

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- New tests pass: PWA icon dimensions are 192×192, 512×512, 180×180
- Manual on deploy preview:
  1. Open Chrome desktop → DevTools → Application → Manifest → "Identity" section → preview icons → confirm they look like three cascading outlined squares (NOT three squares with a download arrow)
  2. Right-click the preview icon → Open in new tab → confirm the URL is `/icons/glass-outlet-symbol-512.png` and the image is the cascading squares
- On phone after merge:
  1. **Uninstall the existing QuickScreen PWA** from home screen (long-press → Remove App / Delete)
  2. Open the production URL in Safari
  3. Tap Share → Add to Home Screen → confirm the new icon is the cascading squares (NOT three squares with download arrow)

## Manual reproduction (for PR description)

1. Build production: `npm run build && npm run preview`
2. Open Chrome, DevTools, Application, Manifest
3. Confirm icons are the cascading squares Glass Outlet symbol
4. Run Lighthouse PWA audit → manifest valid

## Risk

**LOW** — pure asset replacement. The manifest references the same filenames, so no other code changes needed. Iceberg-tip risk: iOS aggressively caches PWA icons; users who installed the PWA before this fix will need to uninstall and reinstall to see the new icon. This is unavoidable PWA behavior and is documented in the PR body for Liam.

## Cache-bust note

If after merging this PR Liam still sees the WRONG icon on a fresh PWA install (not from cache), the next step is to add a cache-bust query param to the manifest icon paths (`/icons/glass-outlet-symbol-192.png?v=2`). Don't do this preemptively — wait for evidence the wrong icon is still being served.
