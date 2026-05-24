# 023 — App icon swap (PWA manifest, apple-touch-icon, browser tab favicon)

Branch: `codex/brief-023-app-icon-swap`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 019 merged (brief 019 deploys the icon assets to `public/icons/`).

Use npm 10.x if package-lock.json needs touching.

## Goal

Replace the placeholder PWA icons that brief 017 generated with the real Glass Outlet symbol (three overlapping squares). This updates the home-screen icon (Android + iOS), the PWA install banner icon, and the browser tab favicon.

## Pre-flight check

Brief 019 deploys all icon assets. Since 023 depends on 019 merged, the files are guaranteed on master:

```bash
test -f public/icons/glass-outlet-symbol-192.png && \
  test -f public/icons/glass-outlet-symbol-512.png && \
  test -f public/icons/apple-touch-icon.png && \
  echo "Assets OK" || echo "MISSING — brief 019 should have deployed these"
```

If any are missing → move brief to `03-paused/` and report "Brief 023 paused: icon assets missing from public/icons/. Brief 019 may not have deployed them correctly. Investigate."

## What to implement

### A. Update PWA manifest

1. Open `public/manifest.webmanifest`.
2. Update the `icons` array to reference the new files:

```json
"icons": [
  {
    "src": "/icons/glass-outlet-symbol-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icons/glass-outlet-symbol-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

3. Delete the old placeholder icon files that brief 017 generated (find by searching `public/` for any 192/512 png files NOT named glass-outlet-symbol-*).

### B. Update apple-touch-icon

4. Open `index.html`.
5. Confirm the existing `<link rel="apple-touch-icon">` tag points at `/icons/apple-touch-icon.png` (which is now the real Glass Outlet symbol at 180×180).
6. If the tag points at an old placeholder path (e.g., `/apple-touch-icon.png` at repo root), update it to `/icons/apple-touch-icon.png` and delete the root-level placeholder.

### C. Update favicon (browser tab)

7. Add or update `<link rel="icon" type="image/png" href="/icons/glass-outlet-symbol-192.png">` in `index.html` head.
8. If there's an existing favicon.ico in the repo root, leave it for legacy fallback OR replace with a 32×32 version of the symbol if one was committed. Document which path was taken in the PR description.

### D. Update theme colors (optional but recommended)

9. While you're in `manifest.webmanifest`, verify `background_color` and `theme_color` match the Glass Outlet brand. If the current values are generic (e.g., `#ffffff`, `#000000`) and you can identify the brand color from the SVG icon palette → update to match. If unsure → leave as-is and note in PR description.

## Files likely involved

- `public/manifest.webmanifest`
- `index.html`
- `public/icons/*` (asset paths only — don't modify the binary files)
- Any old placeholder icons in `public/` get deleted

## Constraints

DO NOT change:
- The icon PNG files themselves (they're committed by Liam — use as-is)
- `src/lib/localBomCalculator.ts`
- Service worker logic
- Any source code outside `index.html` and `manifest.webmanifest`
- `package.json`

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual:
  1. Open `npm run dev`, go to `/fence-calculator`. Browser tab favicon is the Glass Outlet symbol.
  2. Lighthouse PWA audit (Chrome DevTools) → "Manifest" check passes, all icons referenced exist.
  3. On Netlify deploy preview, open on Android Chrome → install banner shows Glass Outlet icon (not placeholder).
  4. On iOS Safari → Share → Add to Home Screen → home screen icon is Glass Outlet symbol.
  5. Standalone PWA mode → launch icon is Glass Outlet symbol.
- No regressions:
  - Service worker still registers in production
  - Customer mode toggle still works
  - Existing PWA install/offline flows unchanged

New tests:
- (Not strictly necessary for asset-only changes, but consider) Test that manifest.webmanifest is valid JSON with required fields

## Manual reproduction (for PR description)

1. Build prod: `npm run build && npm run preview`
2. Open in Chrome → DevTools → Application → Manifest. Verify icons load.
3. Run Lighthouse PWA audit → confirm passing.
4. Install as PWA → confirm icon.

## Risk

**LOW** — pure asset reference swap. Mitigations:
- No code logic changes
- Pre-flight check prevents running against missing files
- Lighthouse audit validates manifest integrity
