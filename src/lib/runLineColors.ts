/**
 * Stroke colours for non-boundary fence runs — **keep in sync** with
 * `RUN_COLORS` in `src/components/canvas/canvasEngine.ts`.
 */
export const RUN_LINE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#eab308",
  "#84cc16",
] as const;

/** Canvas engine `COLOR.gate` — gate markers / gate segment stroke */
export const CANVAS_GATE_STROKE = "#f59e0b";

/** RGBA background tint from hex + alpha (0–1). */
export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
