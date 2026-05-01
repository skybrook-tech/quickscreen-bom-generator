/**
 * Helpers for placing new runs on the canvas such that they don't stack on
 * top of existing geometry. Pure functions — no React, no canvas imports.
 *
 * Scale convention: `px per mm`. Matches `canonicalAdapter.ts` reconstruction.
 * Default fallback 0.1 px/mm (1 px = 10 mm) is used when no existing geometry
 * is present.
 */

import type { CanonicalPayload } from "../types/canonical.types";

const DEFAULT_PX_PER_MM = 0.1;
const DEFAULT_OFFSET_MM = 2000; // 2 metres
const DEFAULT_FIRST_SEG_MM = 3000; // 3 metres — matches RunCard handleAddSegment
const DEFAULT_YORIGIN_STEP_PX = 200; // legacy adapter fallback per run index

export interface Point {
  x: number;
  y: number;
}

/** Pixel-per-mm scale inferred from the first run that has two or more points. */
export function inferScale(payload: CanonicalPayload | null): number {
  if (!payload) return DEFAULT_PX_PER_MM;
  for (const run of payload.runs) {
    const pts = run.geometry?.points;
    if (!pts || pts.length < 2) continue;
    const firstFenceMm =
      run.segments.find((s) => s.kind === "fence")?.segmentWidthMm;
    if (!firstFenceMm || firstFenceMm <= 0) continue;
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const firstPx = Math.sqrt(dx * dx + dy * dy);
    if (firstPx > 1e-6) return firstPx / firstFenceMm;
  }
  return DEFAULT_PX_PER_MM;
}

/** Bounding box over every stored geometry point across every run. */
export function geometryBBox(payload: CanonicalPayload | null): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasAny: boolean;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasAny = false;
  if (payload) {
    for (const run of payload.runs) {
      const pts = run.geometry?.points;
      if (!pts || pts.length === 0) continue;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        hasAny = true;
      }
    }
  }
  if (!hasAny) return { minX: 0, minY: 0, maxX: 0, maxY: 0, hasAny: false };
  return { minX, minY, maxX, maxY, hasAny };
}

/**
 * Two-point, east-bearing stub placed 2m below the furthest stored point.
 * When no existing geometry is present, falls back to the legacy
 * `(0, runIdx * 200px)` anchor so multi-run scenarios still separate.
 *
 * @param payload current canonical payload (may be null for fresh jobs)
 * @param newRunIndex index of the new run within the runs array (post-append)
 * @param firstSegMm length of the first fence segment in mm; used to compute
 *   the second point so the run renders at a sensible initial scale
 */
export function computeNewRunAnchor(
  payload: CanonicalPayload | null,
  newRunIndex: number,
  firstSegMm: number = DEFAULT_FIRST_SEG_MM,
): [Point, Point] {
  const scale = inferScale(payload);
  const bbox = geometryBBox(payload);
  const offsetPx = DEFAULT_OFFSET_MM * scale;
  const segPx = firstSegMm * scale;

  const startX = bbox.hasAny ? bbox.minX : 0;
  const startY = bbox.hasAny
    ? bbox.maxY + offsetPx
    : newRunIndex * DEFAULT_YORIGIN_STEP_PX;

  return [
    { x: startX, y: startY },
    { x: startX + segPx, y: startY },
  ];
}
