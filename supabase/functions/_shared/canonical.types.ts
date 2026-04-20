// canonical.types.ts — Deno-compatible (no Node.js imports)
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
  schemaVersion: string;
  variables: Record<string, string | number | boolean>;
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;
  productCode: string;
  variables?: Record<string, string | number | boolean>;
  leftBoundary: CanonicalBoundary;
  rightBoundary: CanonicalBoundary;
  segments: CanonicalSegment[];
  corners: CanonicalCorner[];
  /**
   * Canvas pixel coordinates of the run's endpoint chain: [start, seg0_end, seg1_end, …].
   * Stored by the canvas adapter so the drawn angles and positions are preserved
   * when the layout is reconstructed. Not used by the BOM engine.
   */
  geometry?: {
    points: Array<{ x: number; y: number }>;
  };
}

export interface CanonicalBoundary {
  type: 'product_post' | 'brick_post' | 'existing_post' | 'wall' | 'corner_90';
  meta?: Record<string, unknown>;
}

export type SegmentKind = 'panel' | 'bay_group' | 'gate_opening' | 'corner';

export interface CanonicalSegment {
  segmentId: string;
  sortOrder: number;
  segmentKind: SegmentKind;
  segmentWidthMm?: number;
  targetHeightMm?: number;
  bayCount?: number;
  gateProductCode?: string;
  /** Per-segment overrides (terminations, bay/post fields, job overrides). */
  variables?: Record<string, string | number | boolean>;
}

export interface CanonicalCorner {
  cornerId: string;
  afterSegmentId: string;
  type: '90';
}
