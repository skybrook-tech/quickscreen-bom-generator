import type { CanonicalRun, CanonicalSegment } from "../types/canonical.types";

/** Fence-only index of the segment at `sorted[sortedIdx]`, or -1 if not fence. */
function fenceIndexAtSortedIdx(
  sorted: CanonicalSegment[],
  sortedIdx: number,
): number {
  if (sorted[sortedIdx]?.kind !== "fence") return -1;
  let fi = 0;
  for (let i = 0; i < sortedIdx; i++) {
    if (sorted[i].kind === "fence") fi++;
  }
  return fi;
}

/**
 * After merging three consecutive fence segments, drop the two interior vertices
 * from `geometry.points` so the polyline stays consistent.
 */
function splicePointsAfterTripleFenceMerge(
  geometry: CanonicalRun["geometry"],
  sorted: CanonicalSegment[],
  prevSortedIdx: number,
): CanonicalRun["geometry"] | undefined {
  const pts = geometry?.points;
  if (!pts || pts.length < 4) return undefined;
  const fi = fenceIndexAtSortedIdx(sorted, prevSortedIdx);
  if (fi < 0 || fi + 3 >= pts.length) return undefined;
  return {
    points: [...pts.slice(0, fi + 1), ...pts.slice(fi + 3)],
  };
}

/**
 * Remove a segment; when the removed segment is a fence with fence neighbours
 * on both sides, merge into one fence (lengths sum, join terminations).
 * Optionally adjusts `geometry.points` when three consecutive fences merge.
 */
export function removeSegmentFromRun(
  run: CanonicalRun,
  segmentId: string,
): CanonicalRun {
  const sorted = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((s) => s.segmentId === segmentId);
  if (idx < 0) return run;

  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  if (
    cur.kind === "fence" &&
    prev?.kind === "fence" &&
    next?.kind === "fence"
  ) {
    const merged: CanonicalSegment = {
      ...prev,
      segmentWidthMm:
        (prev.segmentWidthMm ?? 0) +
        (cur.segmentWidthMm ?? 0) +
        (next.segmentWidthMm ?? 0),
      rightTermination: next.rightTermination,
    };
    const dropIds = new Set([
      prev.segmentId,
      cur.segmentId,
      next.segmentId,
    ]);
    let newSegments = sorted.filter((s) => !dropIds.has(s.segmentId));
    newSegments.push(merged);
    newSegments = newSegments.sort((a, b) => a.sortOrder - b.sortOrder);

    const geometry = splicePointsAfterTripleFenceMerge(
      run.geometry,
      sorted,
      idx - 1,
    );

    return {
      ...run,
      segments: newSegments.map((s, i) => ({ ...s, sortOrder: i })),
      geometry,
    };
  }

  const filtered = sorted.filter((s) => s.segmentId !== segmentId);
  const geometry =
    cur.kind === "fence" ? undefined : run.geometry;

  return {
    ...run,
    segments: filtered.map((s, i) => ({ ...s, sortOrder: i })),
    geometry,
  };
}
