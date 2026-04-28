// canonical.types.ts — Deno edge function (mirrors src/types/canonical.types.ts)
// Keep in sync manually — no import sharing between React and Deno.

export interface CanonicalPayload {
  productCode: string;
  schemaVersion: "v2";
  variables: Record<string, string | number | boolean>;
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;
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
  leftTermination: SegmentTermination;
  rightTermination: SegmentTermination;
  variables?: Record<string, string | number | boolean>;
}
