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
  CanvasLayout,
  CanvasSegment,
  CanvasRunSummary,
} from './canvasEngine';
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
  CanonicalBoundary,
  CanonicalCorner,
} from '../../types/canonical.types';

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

/** Normalise an angle to [0, 360). */
function normaliseAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Unsigned angle difference between two bearing angles, clamped to [0, 180]. */
function angleDelta(a: number, b: number): number {
  const diff = Math.abs(normaliseAngle(a) - normaliseAngle(b));
  return diff > 180 ? 360 - diff : diff;
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
  positionOnSegment: number; // 0–1 fraction
  widthMM: number;
  gateIndex: number; // index within this segment's gates
}

function expandSegmentWithGates(
  seg: CanvasSegment,
  gates: GateInSegment[],
  flatSegIdx: number,
  runIdx: number,
  stableIds: StableIdMap,
  sortOrderBase: number,
): { canonSegments: CanonicalSegment[]; nextSortOrder: number } {
  // Sort gates left-to-right along the segment
  const sorted = [...gates].sort((a, b) => a.positionOnSegment - b.positionOnSegment);
  const totalMm = seg.lengthMM;
  const canonSegments: CanonicalSegment[] = [];
  let sortOrder = sortOrderBase;
  let cursorFraction = 0;

  for (const gate of sorted) {
    const gateStartFraction = gate.positionOnSegment - gate.widthMM / totalMm / 2;
    const gateEndFraction = gate.positionOnSegment + gate.widthMM / totalMm / 2;
    const clampedStart = Math.max(0, gateStartFraction);
    const clampedEnd = Math.min(1, gateEndFraction);

    // Fence panel before this gate opening
    const panelBeforeMm = (clampedStart - cursorFraction) * totalMm;
    if (panelBeforeMm > 1) {
      const desc = `${runIdx}:${flatSegIdx}:before-gate${gate.gateIndex}`;
      const segmentId = stableIds[desc] ?? (() => {
        const id = newId();
        stableIds[desc] = id;
        return id;
      })();
      canonSegments.push({
        segmentId,
        sortOrder: sortOrder++,
        segmentKind: 'panel',
        segmentWidthMm: Math.round(panelBeforeMm),
      });
    }

    // Gate opening segment
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
    canonSegments.push({
      segmentId,
      sortOrder: sortOrder++,
      segmentKind: 'panel',
      segmentWidthMm: Math.round(trailingMm),
    });
  }

  return { canonSegments, nextSortOrder: sortOrder };
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
        widthMM: gate.widthMM,
        gateIndex: gi,
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
          slice.runIdx,
          stableIds,
          sortOrder,
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
        });
      }

      // If there is a corner after this segment, record it
      if (cornerIndices.has(si) && canonSegments.length > 0) {
        const prevSegmentId = canonSegments[canonSegments.length - 1].segmentId;
        const cornerDesc = `corner:${slice.runIdx}:after:${si}`;
        const cornerId = stableIds[cornerDesc] ?? (() => {
          const id = newId();
          stableIds[cornerDesc] = id;
          return id;
        })();
        canonCorners.push({
          cornerId,
          afterSegmentId: prevSegmentId,
          type: '90',
        });
      }
    }

    // Default boundaries: product_post on both ends.
    // Callers can override these with wall/existing_post etc. via the form.
    const leftBoundary: CanonicalBoundary = { type: 'product_post' };
    const rightBoundary: CanonicalBoundary = { type: 'product_post' };

    return {
      runId,
      productCode,
      leftBoundary,
      rightBoundary,
      segments: canonSegments,
      corners: canonCorners,
    };
  });

  return {
    productCode,
    schemaVersion: 'v1',
    variables,
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
  return {
    ...generated,
    runs: generated.runs.map((genRun) => {
      const prevRun = prevRuns.get(genRun.runId);
      if (!prevRun) return genRun;
      const prevSegMap = new Map(prevRun.segments.map((s) => [s.segmentId, s]));
      return {
        ...genRun,
        variables: { ...(prevRun.variables ?? {}), ...(genRun.variables ?? {}) },
        leftBoundary: prevRun.leftBoundary,
        rightBoundary: prevRun.rightBoundary,
        segments: genRun.segments.map((gs) => {
          const ps = prevSegMap.get(gs.segmentId);
          if (!ps) return gs;
          return {
            ...gs,
            variables: { ...(ps.variables ?? {}), ...(gs.variables ?? {}) },
            targetHeightMm: gs.targetHeightMm ?? ps.targetHeightMm,
            gateProductCode: gs.gateProductCode ?? ps.gateProductCode,
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
// Limitations:
//   - Pixel coordinates (startX/Y, endX/Y) cannot be recovered from a
//     canonical payload — they were never stored. We lay segments out in a
//     straight horizontal line starting at the origin. The canvas engine only
//     uses lengthMM for BOM calculations; pixel positions are only used for
//     rendering, so a straight-line layout is correct for reload purposes.
//   - angleDeg is set to 0 (horizontal) for all segments. Corners are not
//     re-drawn as actual angle bends — they remain as flat markers in the data.
//   - Gate openings are converted back to CanvasGate entries with their
//     positionOnSegment reconstructed from the flat segment layout.
// ---------------------------------------------------------------------------

export function canonicalToCanvasLayout(payload: CanonicalPayload): CanvasLayout {
  // We lay out each run as a horizontal line of segments, accumulating x.
  // Each run starts at x=0, y = runIndex * 200 (200px gap between runs).

  const allFlatSegments: CanvasSegment[] = [];
  const allFlatGates: Array<{ segmentIndex: number; positionOnSegment: number; widthMM: number }> = [];
  const runSummaries: CanvasRunSummary[] = [];

  let globalFlatOffset = 0;

  for (let ri = 0; ri < payload.runs.length; ri++) {
    const run = payload.runs[ri];
    const yOrigin = ri * 200; // px — runs are stacked vertically for visual clarity

    let runTotalMm = 0;
    let runCornerCount = 0;
    const runGates: Array<{ segmentIndex: number; positionOnSegment: number; widthMM: number }> = [];

    // Merge consecutive `panel` canonical segments back into canvas segments.
    // Each canonical panel → one canvas segment.
    // Each canonical gate_opening → one CanvasGate on the preceding panel segment
    // (or creates a synthetic 0-length segment if there is no preceding panel).
    //
    // For simplicity: each canonical segment (panel or gate_opening) maps 1:1 to a
    // canvas segment. Gate openings become 0-width canvas segments whose gate marker
    // sits at t=0.5. This preserves all data for re-editing.
    //
    // CanonicalCorners increment the corner count but don't change segment geometry
    // in this 2D reconstruction.

    const fenceSegments = run.segments.filter(s => s.segmentKind !== 'gate_opening');
    const gateSegments = run.segments.filter(s => s.segmentKind === 'gate_opening');

    // Build canvas segments only from fence panels (not gate openings).
    // Gate openings are attached as CanvasGate markers on the preceding fence segment.
    let xCursor = 0;
    const localFlatSegments: CanvasSegment[] = [];

    for (const canonSeg of run.segments) {
      if (canonSeg.segmentKind === 'gate_opening') {
        // Attach this gate to the most recent canvas segment
        const precedingFlatIdx = globalFlatOffset + localFlatSegments.length - 1;
        if (localFlatSegments.length > 0) {
          // Place gate at the right edge of the preceding segment (t=0.9 by convention)
          allFlatGates.push({
            segmentIndex: precedingFlatIdx,
            positionOnSegment: 0.9,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          });
          runGates.push({
            segmentIndex: precedingFlatIdx,
            positionOnSegment: 0.9,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          });
        } else {
          // No preceding segment — create a 1mm stub segment to hold the gate
          const stubEndX = xCursor + 1;
          localFlatSegments.push({
            startX: xCursor,
            startY: yOrigin,
            endX: stubEndX,
            endY: yOrigin,
            lengthMM: 1,
            angleDeg: 0,
          });
          const gateIdx = globalFlatOffset + localFlatSegments.length - 1;
          allFlatGates.push({
            segmentIndex: gateIdx,
            positionOnSegment: 0.5,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          });
          runGates.push({
            segmentIndex: gateIdx,
            positionOnSegment: 0.5,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          });
          xCursor = stubEndX;
        }
      } else {
        // Panel, bay_group, or corner — create a canvas segment
        const widthMm = canonSeg.segmentWidthMm ?? 1000;
        // Convert mm to canvas pixels: default scale is 100px/m
        const widthPx = widthMm / 10; // 100px/m = 10px/mm
        const endX = xCursor + widthPx;
        localFlatSegments.push({
          startX: xCursor,
          startY: yOrigin,
          endX,
          endY: yOrigin,
          lengthMM: widthMm,
          angleDeg: 0,
        });
        runTotalMm += widthMm;
        xCursor = endX;
      }
    }

    // Count corners from the corners array (already computed per-run)
    runCornerCount = run.corners.length;

    allFlatSegments.push(...localFlatSegments);
    globalFlatOffset += localFlatSegments.length;

    // Suppress unused variable warning
    void fenceSegments;
    void gateSegments;

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
  };
}
