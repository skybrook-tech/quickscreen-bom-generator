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
// TERMINATION MODEL
// -----------------
// Adjacent canonical segments share either a `segment_join` (straight-through) or
// a `system_corner` (structural corner fitting) termination. The `system_corner`
// carries a SIGNED interior angle: positive = CW/right turn, negative = CCW/left turn
// in Y-down canvas coordinates. Magnitude is in [1, 179].
// The run's external ends default to `{ kind: "system" }` (product post) which
// the user can override in the Run list form.
//
// GATE SEGMENTS
// -------------
// Each gate marker on a canvas segment produces a `kind: "gate"` segment.
// Fence material on each side of the gate becomes a separate `kind: "fence"` segment.

import type {
  CanvasLayout,
  CanvasSegment,
  CanvasRunSummary,
} from "./canvasEngine";
import type {
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
  SegmentTermination,
} from "../../types/canonical.types";

export const DEFAULT_GATE_PRODUCT_CODE = "QS_GATE";

// ---------------------------------------------------------------------------
// Stable ID map — keyed by a deterministic descriptor so round-trips preserve
// the same IDs.
// ---------------------------------------------------------------------------
export type StableIdMap = Record<string, string>; // descriptor → UUID

const CORNER_ANGLE_THRESHOLD_DEG = 5;

function newId(): string {
  return crypto.randomUUID();
}

function stableId(map: StableIdMap, desc: string): string {
  if (!map[desc]) map[desc] = newId();
  return map[desc];
}

/** Normalise an angle to [0, 360). */
function normaliseAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Signed bearing change from bearing `a` to bearing `b`.
 * Positive = CW (right turn), negative = CCW (left turn). Range (-180, 180].
 */
function signedAngleDelta(a: number, b: number): number {
  let diff = normaliseAngle(b) - normaliseAngle(a);
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}

/**
 * Convert a signed bearing-change (turn angle) to a signed interior angle.
 * Positive turn → positive interior; negative turn → negative interior.
 * e.g. signedTurn=+90 → +90 interior, signedTurn=-45 → -135 interior.
 */
function turnToInterior(signedTurn: number): number {
  return Math.sign(signedTurn) * (180 - Math.abs(signedTurn));
}

// ---------------------------------------------------------------------------
// Reconstruct per-run segment ranges from the flat segment array.
// ---------------------------------------------------------------------------
interface RunSlice {
  summary: CanvasRunSummary;
  runIdx: number;
  flatStart: number;
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
      if (Math.abs(accumulated - targetLengthMm) < 1) break;
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
// Produce the ordered list of "proto-segments" (kind, productCode, widthMm,
// but NO terminations yet) for one canvas segment, splitting it around any
// gate markers.
// ---------------------------------------------------------------------------
type ProtoSegment = Omit<
  CanonicalSegment,
  "leftTermination" | "rightTermination"
>;

interface GateInSegment {
  positionOnSegment: number;
  widthMM: number;
  gateIndex: number;
}

function expandCanvasSegment(
  seg: CanvasSegment,
  gates: GateInSegment[],
  flatSegIdx: number,
  runIdx: number,
  fenceProductCode: string,
  stableIds: StableIdMap,
  sortOrderBase: number,
): { protos: ProtoSegment[]; nextSortOrder: number } {
  const sorted = [...gates].sort(
    (a, b) => a.positionOnSegment - b.positionOnSegment,
  );
  const totalMm = seg.lengthMM;
  const protos: ProtoSegment[] = [];
  let sortOrder = sortOrderBase;
  let cursorFraction = 0;

  for (const gate of sorted) {
    const gateStartFraction =
      gate.positionOnSegment - gate.widthMM / totalMm / 2;
    const gateEndFraction = gate.positionOnSegment + gate.widthMM / totalMm / 2;
    const clampedStart = Math.max(0, gateStartFraction);
    const clampedEnd = Math.min(1, gateEndFraction);

    const panelBeforeMm = (clampedStart - cursorFraction) * totalMm;
    if (panelBeforeMm > 1) {
      protos.push({
        segmentId: stableId(
          stableIds,
          `${runIdx}:${flatSegIdx}:before-gate${gate.gateIndex}`,
        ),
        sortOrder: sortOrder++,
        kind: "fence",
        productCode: fenceProductCode,
        segmentWidthMm: Math.round(panelBeforeMm),
      });
    }

    protos.push({
      segmentId: stableId(
        stableIds,
        `${runIdx}:${flatSegIdx}:gate${gate.gateIndex}`,
      ),
      sortOrder: sortOrder++,
      kind: "gate",
      productCode: DEFAULT_GATE_PRODUCT_CODE,
      segmentWidthMm: Math.round(gate.widthMM),
    });

    cursorFraction = clampedEnd;
  }

  const trailingMm = (1 - cursorFraction) * totalMm;
  if (trailingMm > 1) {
    protos.push({
      segmentId: stableId(
        stableIds,
        `${runIdx}:${flatSegIdx}:trailing`,
      ),
      sortOrder: sortOrder++,
      kind: "fence",
      productCode: fenceProductCode,
      segmentWidthMm: Math.round(trailingMm),
    });
  }

  return { protos, nextSortOrder: sortOrder };
}

// ---------------------------------------------------------------------------
// canvasLayoutToCanonical
// ---------------------------------------------------------------------------
export function canvasLayoutToCanonical(
  layout: CanvasLayout,
  productCode: string,
  variables: Record<string, string | number | boolean>,
  stableIds: StableIdMap = {},
): CanonicalPayload {
  const runSlices = buildRunSlices(layout);

  const canonicalRuns: CanonicalRun[] = runSlices.map((slice) => {
    const runId = stableId(stableIds, `run:${slice.runIdx}`);

    // Collect gate markers per flat segment index
    const gatesPerFlatSeg = new Map<number, GateInSegment[]>();
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

    // Build "spans": each canvas segment becomes a span of 1+ proto-segments.
    // We also record the signed angleDelta to the NEXT canvas segment.
    const spans: { protos: ProtoSegment[]; angleToNext?: number }[] = [];
    let sortOrder = 0;

    for (let si = 0; si < slice.segments.length; si++) {
      const canvasSeg = slice.segments[si];
      const nextCanvasSeg = slice.segments[si + 1];
      const angleToNext = nextCanvasSeg
        ? signedAngleDelta(canvasSeg.angleDeg, nextCanvasSeg.angleDeg)
        : undefined;

      const flatIdx = slice.flatStart + si;
      const gates = gatesPerFlatSeg.get(flatIdx);

      let protos: ProtoSegment[];
      if (gates && gates.length > 0) {
        const result = expandCanvasSegment(
          canvasSeg,
          gates,
          flatIdx,
          slice.runIdx,
          productCode,
          stableIds,
          sortOrder,
        );
        protos = result.protos;
        sortOrder = result.nextSortOrder;
      } else {
        const segDesc = `${slice.runIdx}:${flatIdx}`;
        protos = [
          {
            segmentId: stableId(stableIds, segDesc),
            sortOrder: sortOrder++,
            kind: "fence",
            productCode,
            segmentWidthMm: Math.round(canvasSeg.lengthMM),
          },
        ];
      }

      spans.push({ protos, angleToNext });
    }

    // Assign terminations in a single pass.
    // Rules:
    //   • First segment of run: leftTermination = system
    //   • Last segment of run: rightTermination = system
    //   • First segment of span N>0: if |signedTurn| > threshold → system_corner(signed interior)
    //                                else → segment_join
    //   • Last segment of span 0..N-1: same logic for next span's turn angle
    //   • All other junctions (within a span, e.g. gate splits): segment_join
    const canonSegments: CanonicalSegment[] = [];
    const totalProtos = spans.reduce((s, sp) => s + sp.protos.length, 0);
    let globalIdx = 0;

    function turnToTermination(signedTurn: number | undefined): SegmentTermination {
      if (signedTurn !== undefined && Math.abs(signedTurn) > CORNER_ANGLE_THRESHOLD_DEG) {
        return { kind: "system_corner", angleDeg: Math.round(turnToInterior(signedTurn)) };
      }
      return { kind: "segment_join" };
    }

    for (let si = 0; si < spans.length; si++) {
      const { protos, angleToNext } = spans[si];
      const prevAngle = spans[si - 1]?.angleToNext;

      for (let ji = 0; ji < protos.length; ji++) {
        const isFirstOfRun = globalIdx === 0;
        const isLastOfRun = globalIdx === totalProtos - 1;
        const isFirstOfSpan = ji === 0;
        const isLastOfSpan = ji === protos.length - 1;

        const leftTermination: SegmentTermination = isFirstOfRun
          ? { kind: "system" }
          : isFirstOfSpan
            ? turnToTermination(prevAngle)
            : { kind: "segment_join" };

        const rightTermination: SegmentTermination = isLastOfRun
          ? { kind: "system" }
          : isLastOfSpan
            ? turnToTermination(angleToNext)
            : { kind: "segment_join" };

        canonSegments.push({ ...protos[ji], leftTermination, rightTermination });
        globalIdx++;
      }
    }

    // Store canvas pixel coordinates for faithful reconstruction.
    const fenceCanvasSegs = slice.segments;
    const geometry =
      fenceCanvasSegs.length > 0
        ? {
            points: [
              {
                x: fenceCanvasSegs[0].startX,
                y: fenceCanvasSegs[0].startY,
              },
              ...fenceCanvasSegs.map((s) => ({ x: s.endX, y: s.endY })),
            ],
          }
        : undefined;

    return {
      runId,
      segments: canonSegments,
      geometry,
    };
  });

  return {
    productCode,
    schemaVersion: "v2",
    variables,
    runs:
      canonicalRuns.length > 0
        ? canonicalRuns
        : [
            {
              runId: stableId(stableIds, "run:0"),
              segments: [],
            },
          ],
  };
}

/**
 * After `canvasLayoutToCanonical`, re-attach manual per-segment `variables`
 * for matching `runId` / `segmentId` so layout redraw does not erase Run list
 * segment edits. Also preserves termination overrides set via the form.
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
        segments: genRun.segments.map((gs) => {
          const ps = prevSegMap.get(gs.segmentId);
          if (!ps) return gs;
          return {
            ...gs,
            variables: { ...(ps.variables ?? {}), ...(gs.variables ?? {}) },
            targetHeightMm: gs.targetHeightMm ?? ps.targetHeightMm,
            // Preserve termination overrides from the form ONLY if the user has
            // explicitly set them. Rules:
            // - non_system: always preserve (user explicitly set wall/post).
            // - system_corner: preserve if canvas also produces a system_corner at
            //   that boundary (user may have adjusted angle/direction in the form).
            // - segment_join / system: use canvas value (canvas geometry wins).
            leftTermination:
              ps.leftTermination.kind === "non_system"
                ? ps.leftTermination
                : ps.leftTermination.kind === "system_corner" &&
                    gs.leftTermination.kind === "system_corner"
                  ? ps.leftTermination
                  : gs.leftTermination,
            rightTermination:
              ps.rightTermination.kind === "non_system"
                ? ps.rightTermination
                : ps.rightTermination.kind === "system_corner" &&
                    gs.rightTermination.kind === "system_corner"
                  ? ps.rightTermination
                  : gs.rightTermination,
          };
        }),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// canonicalToCanvasLayout
// ---------------------------------------------------------------------------

/** Euclidean distance between two points. */
function ptDist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function canonicalToCanvasLayout(
  payload: CanonicalPayload,
): CanvasLayout {
  const allFlatSegments: CanvasSegment[] = [];
  const allFlatGates: Array<{
    segmentIndex: number;
    positionOnSegment: number;
    widthMM: number;
  }> = [];
  const runSummaries: CanvasRunSummary[] = [];

  let globalFlatOffset = 0;

  for (let ri = 0; ri < payload.runs.length; ri++) {
    const run = payload.runs[ri];
    const yOrigin = ri * 200;

    let runTotalMm = 0;
    let runCornerCount = 0;
    const runGates: Array<{
      segmentIndex: number;
      positionOnSegment: number;
      widthMM: number;
    }> = [];

    const fenceSegments = run.segments.filter((s) => s.kind === "fence");

    const geomPts = run.geometry?.points;
    const useGeometry = !!(
      geomPts && geomPts.length === fenceSegments.length + 1
    );

    // When stored geometry is available, derive anchor + scale from the first
    // segment and recompute all subsequent pixel positions from payload widths
    // and system_corner angles. This ensures the canvas stays in sync with form
    // edits to segment lengths and corner angles while preserving the drawn
    // starting position and direction.
    let curX = 0;
    let curY = useGeometry ? (geomPts![0]?.y ?? 0) : 0;
    let bearingRad = 0;
    let scale = 0.1; // px per mm fallback (1px = 10mm)

    if (useGeometry && geomPts!.length >= 2) {
      curX = geomPts![0].x;
      curY = geomPts![0].y;
      bearingRad = Math.atan2(
        geomPts![1].y - geomPts![0].y,
        geomPts![1].x - geomPts![0].x,
      );
      const firstMm = fenceSegments[0]?.segmentWidthMm ?? 1000;
      const firstPx = ptDist(geomPts![0], geomPts![1]);
      scale = firstMm > 0 ? firstPx / firstMm : 0.1;
    }

    let xCursor = 0; // used only in no-geometry fallback
    const localFlatSegments: CanvasSegment[] = [];

    for (let ci = 0; ci < run.segments.length; ci++) {
      const canonSeg = run.segments[ci];

      if (canonSeg.kind === "gate") {
        // Attach gate to the most recent canvas segment
        const precedingFlatIdx =
          globalFlatOffset + localFlatSegments.length - 1;
        if (localFlatSegments.length > 0) {
          const gateEntry = {
            segmentIndex: precedingFlatIdx,
            positionOnSegment: 0.9,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          };
          allFlatGates.push(gateEntry);
          runGates.push(gateEntry);
        } else {
          // No preceding segment — stub
          const startX = useGeometry ? (geomPts![0]?.x ?? 0) : xCursor;
          const startY = useGeometry ? (geomPts![0]?.y ?? yOrigin) : yOrigin;
          localFlatSegments.push({
            startX,
            startY,
            endX: startX + 1,
            endY: startY,
            lengthMM: 1,
            angleDeg: 0,
          });
          const gateIdx = globalFlatOffset + localFlatSegments.length - 1;
          const gateEntry = {
            segmentIndex: gateIdx,
            positionOnSegment: 0.5,
            widthMM: canonSeg.segmentWidthMm ?? 900,
          };
          allFlatGates.push(gateEntry);
          runGates.push(gateEntry);
          if (!useGeometry) xCursor += 1;
        }
      } else {
        // Fence segment — count corners from system_corner terminations
        const leftT = canonSeg.leftTermination;
        if (leftT.kind === "system_corner") {
          runCornerCount++;
        }

        const widthMm = canonSeg.segmentWidthMm ?? 1000;
        if (useGeometry) {
          // Anchor + bearing reconstruction: preserve start position and scale
          // from the first drawn segment; recompute subsequent points from
          // payload widths and system_corner angles.
          const pixLen = widthMm * scale;
          const endX = curX + Math.cos(bearingRad) * pixLen;
          const endY = curY + Math.sin(bearingRad) * pixLen;
          localFlatSegments.push({
            startX: curX,
            startY: curY,
            endX,
            endY,
            lengthMM: widthMm,
            angleDeg: (bearingRad * 180) / Math.PI,
          });
          curX = endX;
          curY = endY;
          // Advance bearing for the next segment from this segment's right termination
          const rt = canonSeg.rightTermination;
          if (rt.kind === "system_corner") {
            const signedTurn = Math.sign(rt.angleDeg) * (180 - Math.abs(rt.angleDeg));
            bearingRad += (signedTurn * Math.PI) / 180;
          }
        } else {
          const widthPx = widthMm / 10;
          const endX = xCursor + widthPx;
          localFlatSegments.push({
            startX: xCursor,
            startY: yOrigin,
            endX,
            endY: yOrigin,
            lengthMM: widthMm,
            angleDeg: 0,
          });
          xCursor = endX;
        }
        runTotalMm += widthMm;
      }
    }

    allFlatSegments.push(...localFlatSegments);
    globalFlatOffset += localFlatSegments.length;

    runSummaries.push({
      label: `Run ${ri + 1}`,
      totalLengthM: runTotalMm / 1000,
      cornerCount: runCornerCount,
      gates: runGates,
    });
  }

  const totalLengthM = runSummaries.reduce((sum, r) => sum + r.totalLengthM, 0);
  const totalCornerCount = runSummaries.reduce(
    (sum, r) => sum + r.cornerCount,
    0,
  );

  return {
    segments: allFlatSegments,
    gates: allFlatGates,
    totalLengthM,
    cornerCount: totalCornerCount,
    runs: runSummaries,
    boundaries: [],
  };
}
