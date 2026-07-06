/**
 * Human-readable labels for raw slug values that come from the resolved
 * calculator config (field options_json) and appear in form controls or
 * spec chips.
 *
 * Extend this map when new slugs appear in field config.
 */
export const SLUG_LABELS: Record<string, string> = {
  // Mounting methods
  in_ground: "In-ground (concreted)",
  base_plate: "Base plate",
  core_drilled: "Core-drilled",
  core_drill: "Core-drilled",

  // Post systems / styles
  standard_50: "Standard 50×50",
  standard_65: "Standard 65×65",
  xpl: "XPress Plus (XPL)",
  custom: "Custom",

  // Fence system types
  qshs: "QuickScreen HS",
  vs: "VertiScreen",
  xpl_fence: "XPress Plus",
  bayg: "Bay Gate",
  hssg: "Heavy-duty Swing Gate",

  // Gate types
  single_swing: "Single swing",
  double_swing: "Double swing",
  sliding: "Sliding",

  // Finish types
  standard: "Standard (Colorbond)",
  powder_coat: "Powder coat",
  mill: "Mill finish",

  // Slat sizes
  "65": "65mm",
  "90": "90mm",

  // Panel widths
  "2600": "2600mm (standard)",
  "2000": "2000mm (high-wind)",

  // Post sizes (numeric strings)
  "50": "50×50mm",
  "75": "75×75mm",
  "100": "100×100mm",
};

/**
 * Convert a raw slug to a human-readable label.
 * Falls back to Title Case if no explicit mapping exists.
 */
export function slugToLabel(slug: string): string {
  if (Object.prototype.hasOwnProperty.call(SLUG_LABELS, slug)) {
    return SLUG_LABELS[slug];
  }
  // Title-case fallback: replace underscores and capitalise each word
  return slug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
