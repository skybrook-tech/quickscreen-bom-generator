# Pre-committed assets for the mobile UI fixes batch

**These files are deployed automatically by brief 019.** You don't need to manually copy them anywhere.

When brief 019 runs, its first step copies these files into `public/icons/` and stages them. They become part of brief 019's PR — landing on master in the same commit as the page-cleanup code changes.

## Files

| File | Deployed to | Used by |
|---|---|---|
| `glass-outlet-symbol.svg` | `public/icons/glass-outlet-symbol.svg` | Brief 019 (title bar) |
| `glass-outlet-symbol-192.png` | `public/icons/glass-outlet-symbol-192.png` | Brief 023 (PWA — Android) |
| `glass-outlet-symbol-512.png` | `public/icons/glass-outlet-symbol-512.png` | Brief 023 (PWA splash) |
| `apple-touch-icon.png` | `public/icons/apple-touch-icon.png` | Brief 023 (iOS) |
| `save-icon.png` | `public/icons/save-icon.png` | Brief 022 (bottom nav Save button) |
| `glass-outlet-symbol-256.png` | NOT deployed by default | Title bar fallback if SVG ever rejected |

## You do not need to run any cp commands

Just commit the `_briefs/` folder to your repo and paste MASTER-BRIEF. Codex handles the rest.

## Provenance

- **Glass Outlet symbol PNG sizes** — generated from the 1254×1254 brand asset Liam uploaded, downscaled with Lanczos resampling
- **Glass Outlet symbol SVG** — hand-coded approximation (three 58×58 stroke-only squares offset diagonally), uses `currentColor` for theming. Replace with a brand-source SVG if available.
- **Save icon PNG** — Liam's custom design, downsized to 128×128 (sufficient for bottom-nav button at 2x retina)
