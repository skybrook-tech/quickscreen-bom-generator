// canonical.types.ts — Deno edge function (mirrors src/types/canonical.types.ts)
// Keep in sync manually — no import sharing between React and Deno.

export interface CanonicalPayload {
  productCode: string;
  schemaVersion: "v2";
  propertyAnchor?: {
    lat: number;
    lng: number;
    address: string;
  };
  variables: Record<string, string | number | boolean>;
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;
  /** User-facing label (v4+); optional for backward compatibility. */
  displayName?: string;
  /**
   * Per-run fence system override (v4+). When set, the engine uses this code
   * for run-level validation instead of payload.productCode.
   * Optional for backward compat — pre-v4 payloads do not set this.
   */
  productCode?: string;
  /**
   * Per-run variable defaults (v4+). Merged on top of payload.variables and
   * below segment.variables by the engine. Optional for backward compat.
   */
  variables?: Record<string, string | number | boolean>;
  segments: CanonicalSegment[];
  geometry?: {
    points: Array<{ x: number; y: number }>;
  };
}

export type SegmentTermination =
  | { kind: "system" }
  | { kind: "non_system"; subtype: "wall" | "post" | "other" }
  | { kind: "segment_join" }
  | { kind: "system_corner"; angleDeg: number };

export type SegmentKind = "fence" | "gate";

export interface CanonicalSegment {
  segmentId: string;
  sortOrder: number;
  kind: SegmentKind;
  productCode: string;
  segmentWidthMm?: number;
  targetHeightMm?: number;
  confirmed?: boolean;
  leftTermination: SegmentTermination;
  rightTermination: SegmentTermination;
  variables?: Record<string, string | number | boolean>;
}
