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

export type CanonicalVariableValue = string | number | boolean;

export type CanonicalVariables = Record<string, CanonicalVariableValue>;

export type CanonicalMapLayerId = 'satellite' | 'roadmap';

export interface CanonicalMapSnapshotLayer {
  url: string | null;
  visible: boolean;
  opacity: number;
}

export interface CanonicalMapSnapshot {
  centerLat: number;
  centerLng: number;
  zoom: number;
  width: number;
  height: number;
  /** Original interactive map viewport used for default canvas framing. */
  sourceViewportWidth?: number;
  sourceViewportHeight?: number;
  metresPerPixel: number;
  capturedAt: string;
  layers?: Partial<Record<CanonicalMapLayerId, CanonicalMapSnapshotLayer>>;
  /** Legacy single-image snapshot URL from the first snapshot PR revision. */
  url?: string;
}

export interface CanonicalArrowAnnotation {
  kind: 'arrow';
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  weight: number;
}

export type CanonicalCanvasAnnotation = CanonicalArrowAnnotation;

export interface CanonicalPayload {
  productCode: string;
  schemaVersion: string;
  propertyAnchor?: {
    lat: number;
    lng: number;
    address: string;
  };
  snapshot?: CanonicalMapSnapshot;
  annotations?: CanonicalCanvasAnnotation[];
  job?: {
    description?: string;
    pendingGates?: Array<{
      id: string;
      kind: 'pedestrian' | 'sliding' | 'double_swing';
      widthMm?: number;
      runId: string;
    }>;
  };
  variables: CanonicalVariables;
  runs: CanonicalRun[];
}

export interface CanonicalRun {
  runId: string;
  productCode: string;
  /** User-facing label in lists and on canvas (defaults to "Run n" when absent). V4+. */
  displayName?: string;
  variables?: CanonicalVariables;
  /** V3: explicit boundary type at the start of the run. */
  leftBoundary?: CanonicalBoundary;
  /** V3: explicit boundary type at the end of the run. */
  rightBoundary?: CanonicalBoundary;
  segments: CanonicalSegment[];
  /** V3: corner fittings between segments. */
  corners?: CanonicalCorner[];
  geometry?: {
    points: Array<{ x: number; y: number }>;
    metrePoints?: Array<{ dxMetres: number; dyMetres: number }>;
  };
}

export interface CanonicalBoundary {
  type: 'product_post' | 'brick_post' | 'existing_post' | 'wall' | 'corner_90';
  meta?: Record<string, unknown>;
}

// V4: discriminates fence vs gate segments. V3 uses segmentKind instead.
export type SegmentKind = 'fence' | 'gate' | 'panel' | 'bay_group' | 'gate_opening' | 'corner';

// V4: termination descriptor at each end of a segment.
export type SegmentTermination =
  | { kind: 'system' }
  | { kind: 'non_system'; subtype: 'wall' | 'post' | 'other' }
  | { kind: 'segment_join' }
  | { kind: 'system_corner'; angleDeg: number };

export interface CanonicalSegment {
  segmentId: string;
  sortOrder: number;

  // V4 fields
  /** V4: discriminates fence vs gate segments. */
  kind?: 'fence' | 'gate';
  /** V4: segment is locked for editing. */
  confirmed?: boolean;
  /** V4: product code override per segment. */
  productCode?: string;
  /** V4: termination at the left end of this segment. */
  leftTermination?: SegmentTermination;
  /** V4: termination at the right end of this segment. */
  rightTermination?: SegmentTermination;

  // V3 fields
  /** V3: segment classification. */
  segmentKind?: 'panel' | 'bay_group' | 'gate_opening' | 'corner';
  bayCount?: number;
  gateProductCode?: string;

  // Shared fields
  segmentWidthMm?: number;
  positionOnSegment?: number;
  gateAnchor?: 'start' | 'center' | 'end';
  canvasSegmentIndex?: number;
  sourceSegmentLengthMm?: number;
  targetHeightMm?: number;
  /** Gate-only finished leaves after hinge/latch clearances. Single/sliding: one leaf; double swing: two. */
  leaves?: Array<{ widthMm: number }>;
  variables?: CanonicalVariables;
}

export interface CanonicalCorner {
  cornerId: string;
  afterSegmentId: string;
  type: '90' | '135' | 'custom';
}
