// Mirrors src/lib/segmentTermination.ts — keep in sync manually (Deno bundle).
import type { CanonicalRun, CanonicalSegment } from "./canonical.types.ts";

export const CORNER_DEGREE_OPTIONS = [90, 135] as const;

export function patchSegmentVariables(
  seg: CanonicalSegment,
  patch: Record<string, string | number | boolean | null | undefined>,
): CanonicalSegment {
  const next: Record<string, string | number | boolean> = {
    ...(seg.variables ?? {}),
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") delete next[k];
    else next[k] = v;
  }
  return { ...seg, variables: Object.keys(next).length ? next : undefined };
}

/**
 * Walk a run and return the number of system (fence) posts attributed to each
 * fence segment, keyed by segmentId.
 *
 * Rules:
 *  - `system` end   → this segment owns the end post (+1)
 *  - `non_system`   → no BOM post on that side (wall or external post)
 *  - `segment_join` on the RIGHT → this segment owns the junction post, UNLESS
 *    the next segment is a gate (gate has its own posts)
 *  - `segment_join` on the LEFT  → the post at the junction was already counted
 *    by the previous segment (or belongs to a gate) → 0
 *
 * Gate segments are skipped; they manage their own post counts via product rules.
 */
export function walkRunForPosts(
  run: CanonicalRun,
  numPanelsBySegmentId: Map<string, number>,
): Map<string, number> {
  const result = new Map<string, number>();
  const segs = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.kind !== "fence") continue;

    const numPanels = numPanelsBySegmentId.get(seg.segmentId) ?? 1;
    const prev = segs[i - 1];
    const next = segs[i + 1];

    let posts = numPanels - 1;

    // ── Left end ──────────────────────────────────────────────────────────
    const lt = seg.leftTermination;
    if (lt.kind === "system") {
      posts += 1;
    } else if (lt.kind === "segment_join") {
      posts += 0;
    }

    // ── Right end ─────────────────────────────────────────────────────────
    const rt = seg.rightTermination;
    if (rt.kind === "system") {
      posts += 1;
    } else if (rt.kind === "segment_join") {
      if (next && next.kind === "gate") {
        posts += 0;
      } else {
        posts += 1;
      }
    }

    result.set(seg.segmentId, Math.max(0, posts));
  }

  return result;
}
