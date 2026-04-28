import type { CanonicalRun } from "../types/canonical.types";

export interface RunStats {
  panels: number;
  posts: number;
  corners: number;
  fenceSegments: number;
}

/**
 * Compute panel, post, corner, and segment counts for a single canonical run.
 * Mirrors the walkRunForPosts logic in segmentTermination.ts (keep in sync).
 *
 * Used by RunCard (form display) and the canvas overlay so both surfaces always
 * show identical numbers.
 */
export function calcRunStats(
  run: CanonicalRun,
  jobMaxPanelWidth: number,
): RunStats {
  const sorted = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
  const fenceSegs = sorted.filter((s) => s.kind === "fence");

  // Panels per fence segment
  const panelsBySegId = new Map<string, number>();
  let totalPanels = 0;
  for (const seg of fenceSegs) {
    const maxW = Number(seg.variables?.max_panel_width_mm ?? jobMaxPanelWidth);
    const p = maxW > 0 ? Math.ceil((seg.segmentWidthMm ?? 0) / maxW) : 0;
    panelsBySegId.set(seg.segmentId, p);
    totalPanels += p;
  }

  // Corners: fence segments with system_corner left termination
  let corners = 0;
  for (const seg of fenceSegs) {
    if (seg.leftTermination.kind === "system_corner") {
      corners++;
    }
  }

  // Posts: replicate walkRunForPosts logic
  let totalPosts = 0;
  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    if (seg.kind !== "fence") continue;

    const numPanels = panelsBySegId.get(seg.segmentId) ?? 1;
    const next = sorted[i + 1];

    let posts = numPanels - 1;

    const lt = seg.leftTermination;
    if (lt.kind === "system") posts += 1;
    // segment_join / system_corner left → previous segment already counted the junction post
    // non_system → no post

    const rt = seg.rightTermination;
    if (rt.kind === "system") {
      posts += 1;
    } else if (rt.kind === "segment_join" || rt.kind === "system_corner") {
      // This segment owns the junction post unless next is a gate
      if (!(next && next.kind === "gate")) posts += 1;
    }
    // non_system → no post

    totalPosts += Math.max(0, posts);
  }

  return {
    panels: totalPanels,
    posts: totalPosts,
    corners,
    fenceSegments: fenceSegs.length,
  };
}
