// canonical.types.ts — React app (mirrors supabase/functions/_shared/canonical.types.ts)
// Single source of truth for the canonical payload shape shared by:
//   • canvas adapter (canvasLayoutToCanonical / canonicalToCanvasLayout)
//   • schema-driven form (CalculatorV3Page)
//   • bom-calculator edge function
//   • quote_runs / quote_run_segments tables
//
// IMPORTANT: runId and segmentId MUST be stable across round-trips.
// Never regenerate them in adapter or reducer code — doing so breaks
// save/load and breaks the engine's per-run/segment tagging.

export interface CanonicalPayload {
  productCode: string;
  schemaVersion: "v2";
  variables: Record<string, string | number | boolean>;
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;
  segments: CanonicalSegment[];
  /**
   * Canvas pixel coordinates of the run's endpoint chain: [start, seg0_end, seg1_end, …].
   * Stored by the canvas adapter so the drawn angles and positions are preserved
   * when the layout is reconstructed (e.g. quote save/load, structural form edits).
   * Not used by the BOM engine — ignored by bom-calculator.
   */
  geometry?: {
    points: Array<{ x: number; y: number }>;
  };
}

// ─── Terminations ───────────────────────────────────────────────────────────

/**
 * A segment termination describes what is on one end of a fence/gate segment.
 *
 * - `system`       — a product post (matching the fencing system, e.g. a QSHS post)
 * - `non_system`   — something outside the BOM scope: a brick wall, an existing post, etc.
 * - `segment_join` — the boundary between this segment and the adjacent one in the same run.
 *                    `angleDeg` is the interior angle in degrees (0 = straight continuation).
 *                    Adjacent segments MUST carry matching angleDeg on their shared boundary.
 */
export type SegmentTermination =
  | { kind: "system" }
  | { kind: "non_system"; subtype: "wall" | "post" | "other" }
  | { kind: "segment_join"; angleDeg: number };

// ─── Segment ────────────────────────────────────────────────────────────────

export type SegmentKind = "fence" | "gate";

export interface CanonicalSegment {
  segmentId: string;
  sortOrder: number;
  /** 'fence' for a fencing panel run; 'gate' for a gate opening within a run */
  kind: SegmentKind;
  /** Product code for this segment (e.g. 'QSHS', 'QS_GATE'). */
  productCode: string;
  /** Total run length of this segment in mm. */
  segmentWidthMm?: number;
  targetHeightMm?: number;
  leftTermination: SegmentTermination;
  rightTermination: SegmentTermination;
  /**
   * Per-segment variable overrides (colour, slat_size, gate dimensions, etc.)
   * merged on top of run-level variables by the engine.
   */
  variables?: Record<string, string | number | boolean>;
}
