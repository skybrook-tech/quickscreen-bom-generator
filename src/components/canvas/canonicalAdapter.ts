// canonicalAdapter.ts — Bridges the vanilla canvas engine and the v3 canonical payload.
//
// Two public functions:
//   canvasLayoutToCanonical(layout, productCode, variables, stableIds?)
//   canonicalToCanvasLayout(payload)
//
// STABILITY GUARANTEE
// -------------------
// runId and segmentId MUST survive round-trips. The adapter accepts an optional
// `stableIds` map so callers can pass IDs from a previously saved payload back
// in. Any segment that already has a known ID reuses it; new segments get a
// freshly generated UUID.
//
// CORNER DETECTION
// ----------------
// The canvas engine reports `cornerCount` per run but does NOT expose which
// specific segment pairs have corners between them. We detect corners by
// examining the angle between consecutive segments: when the angle change
// exceeds the threshold (interior angle < 175°), we insert a CanonicalCorner
// after the first segment of the pair.
//
// GATE SEGMENTS
// -------------
// Each gate marker on a segment produces a `gate_opening` segment with a
// `segmentWidthMm` equal to the gate's widthMM. Gate segments are inserted in
// order of `positionOnSegment` after the preceding fence `panel` segment. The
// remaining fence length on the original segment is split into one or two
// additional `panel` segments (before and after the gate opening).

import type {
  CanvasArrowAnnotation,
  CanvasGate,
  CanvasLayout,
  CanvasSegment,
  CanvasRunSummary,
  CanvasStructureTermination,
} from './canvasEngine';
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
  CanonicalBoundary,
  CanonicalCorner,
  CanonicalCanvasAnnotation,
} from '../../types/canonical.types';
import {
  classifyCorner,
  GATE_SEGMENT_STUB_KEYS,
  SEGMENT_TERMINATION_KEYS,
} from '../../lib/segmentTermination';
import { normalizeMapSnapshot } from '../../lib/googleMaps/staticSnapshot';

// ---------------------------------------------------------------------------
// Stable ID map — keyed by a deterministic descriptor so round-trips preserve
// the same IDs. The descriptor is "<runIndex>:<flatSegmentIndex>" for fence
// segments and "<runIndex>:<flatSegmentIndex>:gate<gateIndex>" for gate openings.
// ---------------------------------------------------------------------------
export type StableIdMap = Record<string, string>; // descriptor → UUID

// Corner detection threshold: if the absolute angle delta between two
// consecutive segments exceeds this value (degrees), it is a corner.
const CORNER_ANGLE_THRESHOLD_DEG = 5;

function newId(): string {
  return crypto.randomUUID();
}

function arrowToCanonical(arrow: CanvasArrowAnnotation): CanonicalCanvasAnnotation {
  return {
    kind: 'arrow',
    from: { x: arrow.from.x, y: arrow.from.y },
    to: { x: arrow.to.x, y: arrow.to.y },
    color: arrow.color ?? '#444',
    weight: arrow.weight ?? 2,
  };
}

function arrowToCanvas(annotation: CanonicalCanvasAnnotation): CanvasArrowAnnotation {
  return {
    kind: 'arrow',
    from: { x: annotation.from.x, y: annotation.from.y },
    to: { x: annotation.to.x, y: annotation.to.y },
    color: annotation.color,
    weight: annotation.weight,
  };
}

/** Normalise an angle to [0, 360). */
function normaliseAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Unsigned angle difference between two bearing angles, clamped to [0, 180]. */
function angleDelta(a: number, b: number): number {
  const diff = Math.abs(normaliseAngle(a) - normaliseAngle(b));
  return diff > 180 ? 360 - diff : diff;
}

function cornerInfo(prev: CanvasSegment, next: CanvasSegment): {
  measured: number;
  type: 'right' | 'obtuse' | 'custom';
  degrees: 90 | 135 | number;
  canonicalType: '90' | '135' | 'custom';
} {
  const turn = angleDelta(prev.angleDeg, next.angleDeg);
  const interior = 180 - turn;
  const measured = Math.round(interior);
  const type = classifyCorner(measured);
  if (type === 'right') return { measured, type, degrees: 90, canonicalType: '90' };
  if (type === 'obtuse') return { measured, type, degrees: 135, canonicalType: '135' };
  return { measured, type, degrees: measured, canonicalType: 'custom' };
}

// ---------------------------------------------------------------------------
// Reconstruct per-run segment ranges from the flat segment array.
//
// CanvasLayout gives us:
//   - A flat `segments[]` list in run-order (run 0 first, then run 1, …)
//   - A `runs[]` list of CanvasRunSummary — each has `totalLengthM`
//
// We reconstruct run membership by matching `totalLengthM` to the cumulative
// sum of consecutive flat segment lengths. When a run's accumulated length
// matches its declared totalLengthM (within floating-point tolerance), we close
// the slice.
// ---------------------------------------------------------------------------
interface RunSlice {
  summary: CanvasRunSummary;
  runIdx: number;
  /** inclusive flat index of the first segment in this run */
  flatStart: number;
  /** exclusive flat index (flatStart + segmentCount) */
  flatEnd: number;
  segments: CanvasSegment[];
}

function buildRunSlices(layout: CanvasLayout): RunSlice[] {
  const slices: RunSlice[] = [];
  let flatCursor = 0;

  for (let ri = 0; ri < layout.runs.length; ri++) {
    const summary = layout.runs[ri];
    const targetLengthMm = summary.totalLengthM * 1000;

    let accumulated = 0;
    const flatStart = flatCursor;

    while (flatCursor < layout.segments.length) {
      const seg = layout.segments[flatCursor];
      accumulated += seg.lengthMM;
      flatCursor++;

      // Allow 1mm tolerance for floating-point accumulation
      if (Math.abs(accumulated - targetLengthMm) < 1) break;

      // Safety: if we've overshot, stop before the next segment
      if (accumulated > targetLengthMm + 1) break;
    }

    slices.push({
      summary,
      runIdx: ri,
      flatStart,
      flatEnd: flatCursor,
      segments: layout.segments.slice(flatStart, flatCursor),
    });
  }

  return slices;
}

// ---------------------------------------------------------------------------
// Detect corners within a run's segment list.
// A corner exists between segment[i] and segment[i+1] when their direction
// (angleDeg) diverges by more than CORNER_ANGLE_THRESHOLD_DEG.
// ---------------------------------------------------------------------------
function detectCornerIndices(segments: CanvasSegment[]): Set<number> {
  const corners = new Set<number>();
  for (let i = 0; i < segments.length - 1; i++) {
    const delta = angleDelta(segments[i].angleDeg, segments[i + 1].angleDeg);
    if (delta > CORNER_ANGLE_THRESHOLD_DEG) {
      corners.add(i); // corner after segment[i]
    }
  }
  return corners;
}

// ---------------------------------------------------------------------------
// Split a canvas segment that contains gate markers into an ordered list of
// canonical segments: [panel?, gate_opening, panel?, gate_opening, …, panel?]
// ---------------------------------------------------------------------------
interface GateInSegment {
  positionOnSegment: number; // 0-1 fraction
  anchor?: CanvasGate['anchor'];
  widthMM: number;
  gateIndex: number; // index within this segment's gates
  useGatePostsAsFenceTermination?: boolean;
  gateType?: CanvasGate['gateType'];
  swingDirection?: CanvasGate['swingDirection'];
  slidingSide?: CanvasGate['slidingSide'];
  variables?: CanvasGate['variables'];
}

function gateMovementFromCanvas(gateType: CanvasGate['gateType']) {
  if (gateType === 'sliding') return 'sliding';
  if (gateType === 'double-swing') return 'double_swing';
  return 'single_swing';
}

function gateTypeFromMovement(value: unknown): CanvasGate['gateType'] {
  if (value === 'sliding') return 'sliding';
  if (value === 'double_swing') return 'double-swing';
  return 'single-swing';
}

function gateVisualFromCanon(canonSeg: CanonicalSegment) {
  const gateType = gateTypeFromMovement(canonSeg.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  return {
    gateType,
    swingDirection: String(
      canonSeg.variables?.[GATE_SEGMENT_STUB_KEYS.openingDirection] ??
        (gateType === 'sliding' ? 'right' : 'out'),
    ) as CanvasGate['swingDirection'],
    slidingSide: String(
      canonSeg.variables?.[GATE_SEGMENT_STUB_KEYS.slidingSide] ?? 'front',
    ) as CanvasGate['slidingSide'],
  };
}

function gateFractions(totalMm: number, gate: Pick<GateInSegment, 'positionOnSegment' | 'widthMM' | 'anchor'>) {
  if (totalMm <= 0) return { start: gate.positionOnSegment, end: gate.positionOnSegment };
  const gateFraction = Math.min(1, gate.widthMM / totalMm);
  if (gate.anchor === 'start') return { start: 0, end: gateFraction };
  if (gate.anchor === 'end') return { start: 1 - gateFraction, end: 1 };
  const half = gateFraction / 2;
  return {
    start: Math.max(0, gate.positionOnSegment - half),
    end: Math.min(1, gate.positionOnSegment + half),
  };
}

function mergeSegmentVariables(
  previous: CanonicalSegment['variables'],
  generated: CanonicalSegment['variables'],
): CanonicalSegment['variables'] {
  const merged = { ...(previous ?? {}), ...(generated ?? {}) };

  for (const side of ['left', 'right'] as const) {
    const manualKey =
      side === 'left'
        ? SEGMENT_TERMINATION_KEYS.leftCornerManual
        : SEGMENT_TERMINATION_KEYS.rightCornerManual;
    if (previous?.[manualKey] !== true) continue;

    const keys =
      side === 'left'
        ? [
            SEGMENT_TERMINATION_KEYS.leftKind,
            SEGMENT_TERMINATION_KEYS.leftCornerDegrees,
            SEGMENT_TERMINATION_KEYS.leftCornerMeasuredDegrees,
            SEGMENT_TERMINATION_KEYS.leftCornerType,
            SEGMENT_TERMINATION_KEYS.leftCornerManual,
          ]
        : [
            SEGMENT_TERMINATION_KEYS.rightKind,
            SEGMENT_TERMINATION_KEYS.rightCornerDegrees,
            SEGMENT_TERMINATION_KEYS.rightCornerMeasuredDegrees,
            SEGMENT_TERMINATION_KEYS.rightCornerType,
            SEGMENT_TERMINATION_KEYS.rightCornerManual,
          ];

    for (const key of keys) {
      if (previous[key] !== undefined) merged[key] = previous[key];
    }
  }

  return Object.keys(merged).length ? merged : undefined;
}

function nonSystemSubtypeForCanvasTermination(termination: CanvasStructureTermination) {
  return termination === 'pillar' ? 'pillar' : 'non_system_post';
}

function terminationVariablesForSegment(
  seg: CanvasSegment,
): CanonicalSegment['variables'] {
  const variables: NonNullable<CanonicalSegment['variables']> = {};
  if (seg.startTermination) {
    variables[SEGMENT_TERMINATION_KEYS.leftKind] = 'non_system_termination';
    variables[SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype] =
      nonSystemSubtypeForCanvasTermination(seg.startTermination);
  }
  if (seg.endTermination) {
    variables[SEGMENT_TERMINATION_KEYS.rightKind] = 'non_system_termination';
    variables[SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype] =
      nonSystemSubtypeForCanvasTermination(seg.endTermination);
  }
  return Object.keys(variables).length ? variables : undefined;
}

function geometryPointsForRun(_payload: CanonicalPayload, run: CanonicalRun) {
  return run.geometry?.points;
}

function expandSegmentWithGates(
  seg: CanvasSegment,
  gates: GateInSegment[],
  flatSegIdx: number,
  localSegIdx: number,
  runIdx: number,
  stableIds: StableIdMap,
  sortOrderBase: number,
  defaultHeight: number,
): { canonSegments: CanonicalSegment[]; nextSortOrder: number } {
  // Sort gates left-to-right along the segment
  const sorted = [...gates].sort((a, b) => a.positionOnSegment - b.positionOnSegment);
  const totalMm = seg.lengthMM;
  const canonSegments: CanonicalSegment[] = [];
  let sortOrder = sortOrderBase;
  let cursorFraction = 0;

  for (const gate of sorted) {
    const { start: clampedStart, end: clampedEnd } = gateFractions(totalMm, gate);

    // Fence panel before this gate opening
    const panelBeforeMm = (clampedStart - cursorFraction) * totalMm;
    if (panelBeforeMm > 1) {
      const desc = `${runIdx}:${flatSegIdx}:before-gate${gate.gateIndex}`;
      const segmentId = stableIds[desc] ?? (() => {
        const id = newId();
        stableIds[desc] = id;
        return id;
      })();
      const variables: NonNullable<CanonicalSegment['variables']> = {
        ...(cursorFraction === 0 && seg.startTermination
          ? {
              [SEGMENT_TERMINATION_KEYS.leftKind]: 'non_system_termination',
              [SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype]:
                nonSystemSubtypeForCanvasTermination(seg.startTermination),
            }
          : {}),
        geometry_angle_deg: Math.round(seg.angleDeg),
      };
      if (gate.useGatePostsAsFenceTermination !== false) {
        variables[SEGMENT_TERMINATION_KEYS.rightKind] = 'system_post';
      }
      canonSegments.push({
        segmentId,
        sortOrder: sortOrder++,
        segmentKind: 'panel',
        segmentWidthMm: Math.round(panelBeforeMm),
        canvasSegmentIndex: localSegIdx,
        sourceSegmentLengthMm: Math.round(totalMm),
        targetHeightMm: defaultHeight,
        variables,
      });
    }

    // Gate opening segment
    const parentSectionId = [...canonSegments]
      .reverse()
      .find((segment) => segment.segmentKind !== 'gate_opening')?.segmentId;
    const gateDesc = `${runIdx}:${flatSegIdx}:gate${gate.gateIndex}`;
    const gateSegmentId = stableIds[gateDesc] ?? (() => {
      const id = newId();
      stableIds[gateDesc] = id;
      return id;
    })();
    canonSegments.push({
      segmentId: gateSegmentId,
      sortOrder: sortOrder++,
      segmentKind: 'gate_opening',
      segmentWidthMm: Math.round(gate.widthMM),
      positionOnSegment: gate.positionOnSegment,
      gateAnchor: gate.anchor,
      canvasSegmentIndex: localSegIdx,
      sourceSegmentLengthMm: Math.round(totalMm),
      targetHeightMm: defaultHeight,
      variables: {
        ...(gate.variables ?? {}),
        ...(parentSectionId ? { parent_section_id: parentSectionId } : {}),
        [GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination]:
          gate.useGatePostsAsFenceTermination ?? true,
        [GATE_SEGMENT_STUB_KEYS.gateMovement]: gateMovementFromCanvas(gate.gateType),
        [GATE_SEGMENT_STUB_KEYS.openingDirection]: gate.swingDirection ?? (gate.gateType === 'sliding' ? 'right' : 'out'),
        [GATE_SEGMENT_STUB_KEYS.slidingSide]: gate.slidingSide ?? 'front',
      },
    });

    cursorFraction = clampedEnd;
  }

  // Trailing fence panel after all gates
  const trailingMm = (1 - cursorFraction) * totalMm;
  if (trailingMm > 1) {
    const desc = `${runIdx}:${flatSegIdx}:trailing`;
    const segmentId = stableIds[desc] ?? (() => {
      const id = newId();
      stableIds[desc] = id;
      return id;
    })();
    const variables: NonNullable<CanonicalSegment['variables']> = {
      geometry_angle_deg: Math.round(seg.angleDeg),
      ...(seg.endTermination
        ? {
            [SEGMENT_TERMINATION_KEYS.rightKind]: 'non_system_termination',
            [SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype]:
              nonSystemSubtypeForCanvasTermination(seg.endTermination),
          }
        : {}),
    };
    if (sorted.length > 0 && sorted[sorted.length - 1].useGatePostsAsFenceTermination !== false) {
      variables[SEGMENT_TERMINATION_KEYS.leftKind] = 'system_post';
    }
    canonSegments.push({
      segmentId,
      sortOrder: sortOrder++,
      segmentKind: 'panel',
      segmentWidthMm: Math.round(trailingMm),
      canvasSegmentIndex: localSegIdx,
      sourceSegmentLengthMm: Math.round(totalMm),
      targetHeightMm: defaultHeight,
      variables,
    });
  }

  return { canonSegments, nextSortOrder: sortOrder };
}

// ---------------------------------------------------------------------------
// Stable ID helpers (used by V4 canvas sync)
// ---------------------------------------------------------------------------

function listExpandStableDescriptors(
  runIdx: number,
  flatSegIdx: number,
  seg: CanvasSegment,
  gates: Array<{ positionOnSegment: number; widthMM: number; gateIndex: number }>,
): string[] {
  const sorted = [...gates].sort((a, b) => a.positionOnSegment - b.positionOnSegment);
  const totalMm = seg.lengthMM;
  const out: string[] = [];
  let cursorFraction = 0;
  for (const gate of sorted) {
    const gateStartFraction = gate.positionOnSegment - gate.widthMM / totalMm / 2;
    const gateEndFraction = gate.positionOnSegment + gate.widthMM / totalMm / 2;
    const clampedStart = Math.max(0, gateStartFraction);
    const clampedEnd = Math.min(1, gateEndFraction);
    const panelBeforeMm = (clampedStart - cursorFraction) * totalMm;
    if (panelBeforeMm > 1) out.push(`${runIdx}:${flatSegIdx}:before-gate${gate.gateIndex}`);
    out.push(`${runIdx}:${flatSegIdx}:gate${gate.gateIndex}`);
    cursorFraction = clampedEnd;
  }
  const trailingMm = (1 - cursorFraction) * totalMm;
  if (trailingMm > 1) out.push(`${runIdx}:${flatSegIdx}:trailing`);
  return out;
}

function collectSegmentStableDescriptors(slice: RunSlice): string[] {
  const descriptors: string[] = [];
  const gatesPerFlatSeg = new Map<number, Array<{ positionOnSegment: number; widthMM: number; gateIndex: number }>>();
  for (let gi = 0; gi < slice.summary.gates.length; gi++) {
    const gate = slice.summary.gates[gi];
    const flatIdx = gate.segmentIndex;
    if (!gatesPerFlatSeg.has(flatIdx)) gatesPerFlatSeg.set(flatIdx, []);
    gatesPerFlatSeg.get(flatIdx)!.push({ positionOnSegment: gate.positionOnSegment, widthMM: gate.widthMM, gateIndex: gi });
  }
  for (let si = 0; si < slice.segments.length; si++) {
    const canvasSeg = slice.segments[si];
    const flatIdx = slice.flatStart + si;
    const gates = gatesPerFlatSeg.get(flatIdx);
    if (gates && gates.length > 0) {
      descriptors.push(...listExpandStableDescriptors(slice.runIdx, flatIdx, canvasSeg, gates));
    } else {
      descriptors.push(`${slice.runIdx}:${flatIdx}`);
    }
  }
  return descriptors;
}

export function buildStableIdMapForLayoutSync(
  layout: CanvasLayout,
  previous: CanonicalPayload | null | undefined,
): StableIdMap {
  const stableIds: StableIdMap = {};
  if (!previous?.runs?.length) return stableIds;
  const runSlices = buildRunSlices(layout);
  for (const slice of runSlices) {
    const prevRun = previous.runs[slice.runIdx];
    if (prevRun) stableIds[`run:${slice.runIdx}`] = prevRun.runId;
    if (!prevRun?.segments?.length) continue;
    const descs = collectSegmentStableDescriptors(slice);
    if (descs.length !== prevRun.segments.length) continue;
    for (let i = 0; i < descs.length; i++) {
      stableIds[descs[i]] = prevRun.segments[i].segmentId;
    }
  }
  return stableIds;
}

// ---------------------------------------------------------------------------
// canvasLayoutToCanonical
// ---------------------------------------------------------------------------

/**
 * Convert a CanvasLayout (from canvasEngine.getLayout()) into a CanonicalPayload.
 *
 * @param layout        Result of canvasEngine.getLayout()
 * @param productCode   Top-level product code (e.g. 'QSHS')
 * @param variables     Job-level variables (colour, height, system settings)
 * @param stableIds     Optional map of descriptor→UUID from a previous call.
 *                      Pass the same map across calls to preserve stable IDs.
 *                      Mutated in-place with any newly generated IDs.
 */
export function canvasLayoutToCanonical(
  layout: CanvasLayout,
  productCode: string,
  variables: Record<string, string | number | boolean>,
  stableIds: StableIdMap = {},
): CanonicalPayload {
  const runSlices = buildRunSlices(layout);
  const annotations = (layout.arrows ?? []).map(arrowToCanonical);

  const canonicalRuns: CanonicalRun[] = runSlices.map((slice) => {
    // Stable runId keyed by run index
    const runDesc = `run:${slice.runIdx}`;
    const runId = stableIds[runDesc] ?? (() => {
      const id = newId();
      stableIds[runDesc] = id;
      return id;
    })();

    const cornerIndices = detectCornerIndices(slice.segments);

    // Collect gate markers per flat segment index
    const gatesPerFlatSeg: Map<number, GateInSegment[]> = new Map();
    for (let gi = 0; gi < slice.summary.gates.length; gi++) {
      const gate = slice.summary.gates[gi];
      const flatIdx = gate.segmentIndex;
      if (!gatesPerFlatSeg.has(flatIdx)) gatesPerFlatSeg.set(flatIdx, []);
      gatesPerFlatSeg.get(flatIdx)!.push({
        positionOnSegment: gate.positionOnSegment,
        anchor: gate.anchor,
        widthMM: gate.widthMM,
        gateIndex: gi,
        useGatePostsAsFenceTermination:
          gate.useGatePostsAsFenceTermination ?? true,
        gateType: gate.gateType,
        swingDirection: gate.swingDirection,
        slidingSide: gate.slidingSide,
        variables: gate.variables,
      });
    }

    const canonSegments: CanonicalSegment[] = [];
    const canonCorners: CanonicalCorner[] = [];
    let sortOrder = 0;

    for (let si = 0; si < slice.segments.length; si++) {
      const flatIdx = slice.flatStart + si;
      const seg = slice.segments[si];
      const gates = gatesPerFlatSeg.get(flatIdx);

      if (gates && gates.length > 0) {
        // Segment has gate markers — expand into panel/gate_opening sub-segments
        const { canonSegments: expanded, nextSortOrder } = expandSegmentWithGates(
          seg,
          gates,
          flatIdx,
          si,
          slice.runIdx,
          stableIds,
          sortOrder,
          Number(variables.target_height_mm ?? 1800),
        );
        canonSegments.push(...expanded);
        sortOrder = nextSortOrder;
      } else {
        // Plain fence panel segment
        const segDesc = `${slice.runIdx}:${flatIdx}`;
        const segmentId = stableIds[segDesc] ?? (() => {
          const id = newId();
          stableIds[segDesc] = id;
          return id;
        })();
        canonSegments.push({
          segmentId,
          sortOrder: sortOrder++,
          segmentKind: 'panel',
          segmentWidthMm: Math.round(seg.lengthMM),
          canvasSegmentIndex: si,
          sourceSegmentLengthMm: Math.round(seg.lengthMM),
          targetHeightMm: Number(variables.target_height_mm ?? 1800),
          variables: {
            ...(terminationVariablesForSegment(seg) ?? {}),
            geometry_angle_deg: Math.round(seg.angleDeg),
          },
        });
      }

      // If there is a corner after this segment, record it
      if (cornerIndices.has(si) && canonSegments.length > 0) {
        const prevSegmentId = canonSegments[canonSegments.length - 1].segmentId;
        const corner = cornerInfo(
          slice.segments[si],
          slice.segments[si + 1],
        );
        const prevSegment = canonSegments[canonSegments.length - 1];
        prevSegment.variables = {
          ...(prevSegment.variables ?? {}),
          right_termination_kind: 'corner',
          right_corner_degrees: corner.degrees,
          right_corner_measured_degrees: corner.measured,
          right_corner_type: corner.type,
          right_corner_manual: false,
        };
        const cornerDesc = `corner:${slice.runIdx}:after:${si}`;
        const cornerId = stableIds[cornerDesc] ?? (() => {
          const id = newId();
          stableIds[cornerDesc] = id;
          return id;
        })();
        canonCorners.push({
          cornerId,
          afterSegmentId: prevSegmentId,
          type: corner.canonicalType,
        });
      }
    }

    // Default boundaries: product_post on both ends.
    // Callers can override these with wall/existing_post etc. via the form.
    const leftBoundary: CanonicalBoundary = { type: 'product_post' };
    const rightBoundary: CanonicalBoundary = { type: 'product_post' };

    // Store the actual canvas pixel coordinates so the layout (angles, positions)
    // can be faithfully reconstructed when the payload is pushed back to the canvas.
    const geometry = slice.segments.length > 0
      ? {
          points: [
            { x: slice.segments[0].startX, y: slice.segments[0].startY },
            ...slice.segments.map((s) => ({ x: s.endX, y: s.endY })),
          ],
        }
      : undefined;

    return {
      runId,
      productCode,
      variables,
      leftBoundary,
      rightBoundary,
      segments: canonSegments,
      corners: canonCorners,
      geometry,
    };
  });

  return {
    productCode,
    schemaVersion: 'v1',
    variables,
    ...(annotations.length > 0 ? { annotations } : {}),
    runs: canonicalRuns.length > 0 ? canonicalRuns : [
      // Fallback: empty payload still needs at least one run to be valid.
      // This branch is only hit if layout.runs is empty.
      {
        runId: stableIds['run:0'] ?? (stableIds['run:0'] = newId()),
        productCode,
        leftBoundary: { type: 'product_post' },
        rightBoundary: { type: 'product_post' },
        segments: [],
        corners: [],
      },
    ],
  };
}

/**
 * After `canvasLayoutToCanonical`, re-attach manual per-segment `variables`,
 * run-level boundaries, and run `variables` for matching `runId` / `segmentId`
 * so layout redraw does not erase Run list segment edits.
 */
export function mergeCanonicalPreservingSegmentMeta(
  previous: CanonicalPayload,
  generated: CanonicalPayload,
): CanonicalPayload {
  const prevRuns = new Map(previous.runs.map((r) => [r.runId, r]));
  const snapshot =
    normalizeMapSnapshot(generated.snapshot ?? previous.snapshot) ??
    generated.snapshot ??
    previous.snapshot;
  return {
    ...generated,
    propertyAnchor: generated.propertyAnchor ?? previous.propertyAnchor,
    snapshot,
    annotations: generated.annotations ?? previous.annotations,
    runs: generated.runs.map((genRun) => {
      const anchoredRun = genRun;
      const prevRun = prevRuns.get(genRun.runId);
      if (!prevRun) return anchoredRun;
      const prevSegMap = new Map(prevRun.segments.map((s) => [s.segmentId, s]));
      return {
        ...anchoredRun,
        variables: { ...(prevRun.variables ?? {}), ...(genRun.variables ?? {}) },
        leftBoundary: prevRun.leftBoundary,
        rightBoundary: prevRun.rightBoundary,
        segments: anchoredRun.segments.map((gs) => {
          const ps = prevSegMap.get(gs.segmentId);
          if (!ps) return gs;
          return {
            ...gs,
            variables: mergeSegmentVariables(ps.variables, gs.variables),
            targetHeightMm: gs.targetHeightMm ?? ps.targetHeightMm,
            gateProductCode: gs.gateProductCode ?? ps.gateProductCode,
            leaves: ps.leaves ?? gs.leaves,
          };
        }),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// canonicalToCanvasLayout
//
// Converts a saved CanonicalPayload back into a CanvasLayout so the canvas
// engine can be restored (e.g. when loading a saved quote).
//
// If a run has stored `geometry.points`, those pixel coordinates are used
// directly, preserving the actual drawn angles and positions. Otherwise it
// falls back to a flat horizontal reconstruction.
// ---------------------------------------------------------------------------

export function canonicalToCanvasLayout(payload: CanonicalPayload): CanvasLayout {
  const allFlatSegments: CanvasSegment[] = [];
  const allFlatGates: CanvasGate[] = [];
  const runSummaries: CanvasRunSummary[] = [];

  let globalFlatOffset = 0;

  for (let ri = 0; ri < payload.runs.length; ri++) {
    const run = payload.runs[ri];
    const yOrigin = ri * 200; // fallback: runs stacked vertically

    let runTotalMm = 0;
    let runCornerCount = 0;
    const runGates: CanvasGate[] = [];

    // Determine whether stored geometry is usable. Older payloads may have
    // fewer geometry points than fence segments after a gate split; in that
    // case per-segment geometry_angle_deg hints preserve turns instead of
    // falling back to a flat straight line.
    const geomPts = geometryPointsForRun(payload, run);
    const useGeometry = !!(geomPts && geomPts.length >= 2);

    let xCursor = 0;       // used only in flat-horizontal fallback
    let fenceSegIdx = 0;   // index into fenceSegments for geometry path
    const localFlatSegments: CanvasSegment[] = [];

    const hasCanvasSegmentMetadata =
      useGeometry &&
      run.segments.some((segment) => segment.canvasSegmentIndex !== undefined);

    if (hasCanvasSegmentMetadata) {
      for (let i = 0; i < geomPts!.length - 1; i++) {
        const p0 = geomPts![i];
        const p1 = geomPts![i + 1];
        const metadataSource = run.segments.find(
          (segment) => segment.canvasSegmentIndex === i,
        );
        const lengthMM =
          metadataSource?.sourceSegmentLengthMm ??
          metadataSource?.segmentWidthMm ??
          Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) * 10);
        localFlatSegments.push({
          startX: p0.x,
          startY: p0.y,
          endX: p1.x,
          endY: p1.y,
          lengthMM,
          angleDeg: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI,
        });
        runTotalMm += lengthMM;
      }

      for (const canonSeg of run.segments) {
        if (canonSeg.segmentKind !== 'gate_opening') continue;
        const localSegIdx = canonSeg.canvasSegmentIndex ?? 0;
        if (!localFlatSegments[localSegIdx]) continue;
        const flatIdx = globalFlatOffset + localSegIdx;
        const positionOnSegment =
          typeof canonSeg.positionOnSegment === 'number'
            ? Math.max(0, Math.min(1, canonSeg.positionOnSegment))
            : 0.9;
        const gate = {
          segmentIndex: flatIdx,
          positionOnSegment,
          anchor: canonSeg.gateAnchor ?? 'center' as CanvasGate['anchor'],
          widthMM: canonSeg.segmentWidthMm ?? 900,
          gateId: canonSeg.segmentId,
          useGatePostsAsFenceTermination:
            canonSeg.variables?.use_gate_posts_as_fence_termination !== false,
          variables: canonSeg.variables,
          ...gateVisualFromCanon(canonSeg),
        };
        allFlatGates.push(gate);
        runGates.push(gate);
      }

      runCornerCount = (run.corners ?? []).length;
      allFlatSegments.push(...localFlatSegments);
      globalFlatOffset += localFlatSegments.length;
      runSummaries.push({
        label: `Run ${ri + 1}`,
        totalLengthM: runTotalMm / 1000,
        cornerCount: runCornerCount,
        gates: runGates,
      });
      continue;
    }

    for (const canonSeg of run.segments) {
      if (canonSeg.segmentKind === 'gate_opening') {
        // Attach this gate to the most recent canvas segment
        const precedingFlatIdx = globalFlatOffset + localFlatSegments.length - 1;
        if (localFlatSegments.length > 0) {
          const positionOnSegment =
            typeof canonSeg.positionOnSegment === 'number'
              ? Math.max(0, Math.min(1, canonSeg.positionOnSegment))
              : 0.9;
          const gateAnchor = canonSeg.gateAnchor ?? 'end';
          allFlatGates.push({
            segmentIndex: precedingFlatIdx,
            positionOnSegment,
            anchor: gateAnchor,
            widthMM: canonSeg.segmentWidthMm ?? 900,
            gateId: canonSeg.segmentId,
            useGatePostsAsFenceTermination:
              canonSeg.variables?.use_gate_posts_as_fence_termination !== false,
            variables: canonSeg.variables,
            ...gateVisualFromCanon(canonSeg),
          });
          runGates.push({
            segmentIndex: precedingFlatIdx,
            positionOnSegment,
            anchor: gateAnchor,
            widthMM: canonSeg.segmentWidthMm ?? 900,
            gateId: canonSeg.segmentId,
            useGatePostsAsFenceTermination:
              canonSeg.variables?.use_gate_posts_as_fence_termination !== false,
            variables: canonSeg.variables,
            ...gateVisualFromCanon(canonSeg),
          });
        } else {
          // No preceding segment — stub to hold the gate
          const startX = useGeometry ? (geomPts![0]?.x ?? 0) : xCursor;
          const startY = useGeometry ? (geomPts![0]?.y ?? yOrigin) : yOrigin;
          localFlatSegments.push({
            startX, startY,
            endX: startX + 1, endY: startY,
            lengthMM: 1, angleDeg: 0,
          });
          const gateIdx = globalFlatOffset + localFlatSegments.length - 1;
          allFlatGates.push({ segmentIndex: gateIdx, positionOnSegment: 0, anchor: 'start', widthMM: canonSeg.segmentWidthMm ?? 900, gateId: canonSeg.segmentId, variables: canonSeg.variables, ...gateVisualFromCanon(canonSeg) });
          runGates.push({ segmentIndex: gateIdx, positionOnSegment: 0, anchor: 'start', widthMM: canonSeg.segmentWidthMm ?? 900, gateId: canonSeg.segmentId, variables: canonSeg.variables, ...gateVisualFromCanon(canonSeg) });
          if (!useGeometry) xCursor += 1;
        }
      } else {
        // Panel, bay_group, or corner
        const widthMm = canonSeg.segmentWidthMm ?? 1000;
        if (widthMm <= 1) {
          fenceSegIdx++;
          continue;
        }
        if (useGeometry) {
          const sourceIdx = Math.min(fenceSegIdx, geomPts!.length - 2);
          const sourceP0 = geomPts![sourceIdx];
          const sourceP1 = geomPts![sourceIdx + 1];
          const p0 =
            localFlatSegments.length > 0
              ? {
                  x: localFlatSegments[localFlatSegments.length - 1].endX,
                  y: localFlatSegments[localFlatSegments.length - 1].endY,
                }
              : sourceP0;
          const hintedAngle = Number(canonSeg.variables?.geometry_angle_deg);
          const sourceAngle =
            Number.isFinite(hintedAngle)
              ? (hintedAngle * Math.PI) / 180
              : Math.atan2(sourceP1.y - sourceP0.y, sourceP1.x - sourceP0.x);
          const targetPx = widthMm / 10; // 100px/m = 10mm per px
          const unitX = Math.cos(sourceAngle);
          const unitY = Math.sin(sourceAngle);
          const p1 = {
            x: p0.x + unitX * targetPx,
            y: p0.y + unitY * targetPx,
          };
          localFlatSegments.push({
            startX: p0.x, startY: p0.y,
            endX: p1.x, endY: p1.y,
            lengthMM: widthMm,
            angleDeg: Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI,
          });
        } else {
          const widthPx = widthMm / 10; // 100px/m = 10px/mm
          const endX = xCursor + widthPx;
          localFlatSegments.push({
            startX: xCursor, startY: yOrigin,
            endX, endY: yOrigin,
            lengthMM: widthMm, angleDeg: 0,
          });
          xCursor = endX;
        }
        runTotalMm += widthMm;
        fenceSegIdx++;
      }
    }

    // Count corners from the corners array (already computed per-run)
    runCornerCount = (run.corners ?? []).length;

    allFlatSegments.push(...localFlatSegments);
    globalFlatOffset += localFlatSegments.length;

    runSummaries.push({
      label: `Run ${ri + 1}`,
      totalLengthM: runTotalMm / 1000,
      cornerCount: runCornerCount,
      gates: runGates,
    });
  }

  // Add all flat gates to the main gates list
  const totalLengthM = runSummaries.reduce((sum, r) => sum + r.totalLengthM, 0);
  const totalCornerCount = runSummaries.reduce((sum, r) => sum + r.cornerCount, 0);

  return {
    segments: allFlatSegments,
    gates: allFlatGates,
    totalLengthM,
    cornerCount: totalCornerCount,
    runs: runSummaries,
    boundaries: [], // canonical payload has no boundary context lines
    textNotes: [], // canonical payload has no text annotations
    arrows: (payload.annotations ?? []).map(arrowToCanvas),
  };
}
