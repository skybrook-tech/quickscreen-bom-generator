import colorContrast from 'color-contrast';

export type TenantBranding = {
  title: string;
  titleItalic?: string;
  subtitle: string;
  hideThemeToggle: boolean;
};

export type TenantTheme = {
  cssVars: Record<string, string>;
  branding: TenantBranding;
};

// Words ignored when deriving an org's initials badge.
const INITIAL_STOPWORDS = new Set(['the', 'a', 'an', 'and', 'of', '&']);

/**
 * Derive a short initials badge from an org name for the no-logo fallback.
 * Drops leading articles/conjunctions, takes the first letter of the first two
 * significant words: "The Glass Outlet" → "GO", "Amazing Fencing" → "AF".
 * A single significant word falls back to its first two characters ("Acme" → "AC").
 */
export function orgInitials(name: string | null | undefined): string {
  const words = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !INITIAL_STOPWORDS.has(w.toLowerCase()));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type ContrastPair = { textVar: string; bgVar: string; threshold: number };

const CONTRAST_PAIRS: ContrastPair[] = [
  { textVar: '--brand-text',        bgVar: '--brand-bg',        threshold: 4.5 },
  { textVar: '--brand-text',        bgVar: '--brand-card',      threshold: 4.5 },
  { textVar: '--brand-muted',       bgVar: '--brand-bg',        threshold: 3.0 },
  { textVar: '--brand-muted',       bgVar: '--brand-card',      threshold: 3.0 },
  { textVar: '--brand-header-text', bgVar: '--brand-header-bg', threshold: 4.5 },
];

// Normalise a CSS color value so color-contrast can parse it.
// Handles hex (#rrggbb), CSS functions (rgb/hsl), named colors, and the
// Tailwind space-separated RGB channel format ("90 138 50").
function parseCssColor(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl') || /^[a-z]+$/i.test(v)) {
    return v;
  }
  // Tailwind space-sep RGB: "90 138 50" → "rgb(90,138,50)"
  const parts = v.split(/\s+/);
  if (parts.length === 3 && parts.every((p) => !isNaN(Number(p)))) {
    return `rgb(${parts.join(',')})`;
  }
  return null;
}

/**
 * Returns a copy of the theme with any text/background pairs that fail WCAG
 * thresholds replaced by black or white (whichever contrasts better with the
 * background). Background vars are never modified.
 */
export function adjustThemeContrast(theme: TenantTheme): TenantTheme {
  const vars = { ...theme.cssVars };

  for (const { textVar, bgVar, threshold } of CONTRAST_PAIRS) {
    const fg = parseCssColor(vars[textVar] ?? '');
    const bg = parseCssColor(vars[bgVar] ?? '');
    if (!fg || !bg) continue;
    try {
      if (colorContrast(fg, bg) < threshold) {
        vars[textVar] =
          colorContrast(bg, '#000000') >= colorContrast(bg, '#ffffff')
            ? '#000000'
            : '#ffffff';
      }
    } catch {
      // Unparseable color value — skip silently rather than crash.
    }
  }

  return { ...theme, cssVars: vars };
}
