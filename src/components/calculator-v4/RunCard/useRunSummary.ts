import { useMemo } from "react";
import type { CanonicalRun } from "../../../types/canonical.types";

export interface RunSummary {
  totalLengthM: number;
  maxHeightMm: number;
  actualHeightMm: number;
  segmentCount: number;
  panelCount: number;
  postCount: number;
  cornerCount: number;
  gateCount: number;
}

/**
 * Cheap client-side summary used in the run card header. Engine produces
 * authoritative numbers — this is just a fast preview for UI hints.
 */
export function useRunSummary(
  run: CanonicalRun,
  effectiveVars: Record<string, string | number | boolean>,
): RunSummary {
  return useMemo(() => {
    const segs = run.segments.filter((s) => s.kind === "fence");
    const totalLengthMm = segs.reduce((s, x) => s + (x.segmentWidthMm ?? 0), 0);
    const totalLengthM = totalLengthMm / 1000;

    const maxHeightMm = segs.reduce(
      (m, x) => Math.max(m, x.targetHeightMm ?? 0),
      0,
    );

    const slatSize = Number(effectiveVars["slat_size_mm"] ?? 65);
    const slatGap = Number(effectiveVars["slat_gap_mm"] ?? 5);
    const stride = slatSize + slatGap;
    const slatCount = stride > 0 ? Math.floor(maxHeightMm / stride) : 0;
    const actualHeightMm =
      slatCount * slatSize + Math.max(0, slatCount - 1) * slatGap;

    const maxPanelMm = Number(effectiveVars["max_panel_width_mm"] ?? 2600);
    const panelCount = segs.reduce(
      (s, x) =>
        s + Math.max(1, Math.ceil((x.segmentWidthMm ?? 0) / maxPanelMm)),
      0,
    );

    const cornerCount = run.segments.filter(
      (s) =>
        s.leftTermination.kind === "system_corner" ||
        s.rightTermination.kind === "system_corner",
    ).length;

    // Rough estimate: panels + 1 per fence segment for end-posts (engine wins).
    const postCount = panelCount + segs.length;

    const gateCount = run.segments.filter((s) => s.kind === "gate").length;

    return {
      totalLengthM,
      maxHeightMm,
      actualHeightMm,
      segmentCount: run.segments.length,
      panelCount,
      postCount,
      cornerCount,
      gateCount,
    };
  }, [run, effectiveVars]);
}
