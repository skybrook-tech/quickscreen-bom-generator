// postSpacing.ts — product-neutral post/panel-spacing clamp.
//
// Pure numeric helper with no product-code knowledge. The backend keeps its own
// independent copy in bom-calculator-static/engine-utils.ts.

export const MIN_POST_SPACING_MM = 100;
export const MAX_POST_SPACING_MM = 3000;

export function clampPostSpacing(value: unknown, fallback = 2600) {
  const spacing = Number(value);
  const resolved = Number.isFinite(spacing) ? spacing : fallback;
  return Math.min(MAX_POST_SPACING_MM, Math.max(MIN_POST_SPACING_MM, Math.round(resolved)));
}
