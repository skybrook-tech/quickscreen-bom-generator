import type { CanonicalRun } from '../types/canonical.types';

export interface RunStats {
  panels: number;
  posts: number;
  corners: number;
  fenceSegments: number;
}

/**
 * Compute panel, post, corner, and segment counts for a single canonical run.
 *
 * Post formula: (panels - 1) internal posts + end posts (0–2 by boundary type) + 1 per corner.
 * Example: 4 panels, both ends post-terminated, 1 corner = 3 + 2 + 1 = 6 posts.
 *
 * Used by RunCard (form display) and the canvas overlay (via LayoutCanvasV3 push) so
 * both surfaces always show identical numbers.
 */
export function calcRunStats(run: CanonicalRun, jobMaxPanelWidth: number): RunStats {
  const corners = run.corners.length;
  const fenceSegs = run.segments.filter((s) => s.segmentKind !== 'gate_opening');

  let panels = 0;
  for (const seg of fenceSegs) {
    const maxW = Number(seg.variables?.max_panel_width_mm ?? jobMaxPanelWidth);
    if (maxW > 0) panels += Math.ceil((seg.segmentWidthMm ?? 0) / maxW);
  }

  const leftWall  = run.leftBoundary?.type  === 'wall';
  const rightWall = run.rightBoundary?.type === 'wall';
  const endPosts  = (leftWall ? 0 : 1) + (rightWall ? 0 : 1);
  const posts = panels > 0 ? panels - 1 + endPosts + corners : 0;

  return { panels, posts, corners, fenceSegments: fenceSegs.length };
}
