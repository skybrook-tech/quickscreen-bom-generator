# UI theme (light and dark)

The app supports **light and dark** themes. Do not assume a single background or that grey text meant for a dark surface will work on a light card.

## Mechanism

- **`ThemeProvider`** ([`src/context/ThemeContext.tsx`](../src/context/ThemeContext.tsx)) sets `data-theme="dark"` on `<html>`, or clears it for light.
- **CSS variables** in [`src/index.css`](../src/index.css) under `:root` (light) and `[data-theme="dark"]` drive `--brand-bg`, `--brand-card`, `--brand-border`, `--brand-text`, `--brand-muted`, etc.
- **Tailwind** ([`tailwind.config.js`](../tailwind.config.js)) uses `darkMode: ["selector", '[data-theme="dark"]']`, so `dark:*` utilities apply in dark mode.
- **Semantic utilities**: `bg-brand-bg`, `text-brand-text`, `text-brand-muted`, `border-brand-border`, `bg-brand-card` follow the active theme.

## Rules for new UI

1. Prefer **semantic `brand-*` classes** for text and surfaces so they track `index.css` for both themes.
2. **Avoid** using `text-neutral-200`–`text-neutral-400` for normal body or value text on `brand-card` in light mode—contrast is often poor. If you need a “lighter” secondary line, use **`text-brand-muted`** or **`text-brand-text/80`**.
3. **Form controls** should mirror [`Input`](../src/components/ui/Input.tsx): `bg-white border border-brand-border text-brand-text` with `dark:bg-brand-card dark:border-brand-border`.
4. If you **must** use Tailwind `neutral-*` (e.g. a one-off separator), pair light and dark explicitly, e.g. `text-neutral-500 dark:text-neutral-400`, or use opacity on brand text.
5. **On-colour rows** (e.g. segment rows on a fence accent background) may keep **white** / **white/80** text; that is overlay text, not theme body text.

## Reference

- Variable definitions: [`src/index.css`](../src/index.css) (`:root` vs `[data-theme="dark"]`).
