import type {
  CanonicalBoundary,
  CanonicalPayload,
  CanonicalRun,
  CanonicalSegment,
  SegmentTermination,
} from "../types/canonical.types";
import { SEGMENT_TERMINATION_KEYS } from "./segmentTermination";

type Variables = Record<string, string | number | boolean>;

function boundaryToTermination(boundary?: CanonicalBoundary): SegmentTermination {
  if (boundary?.type === "wall") return { kind: "non_system", subtype: "wall" };
  if (boundary?.type === "brick_post" || boundary?.type === "existing_post") {
    return { kind: "non_system", subtype: "post" };
  }
  if (boundary?.type === "corner_90") return { kind: "system_corner", angleDeg: 90 };
  return { kind: "system" };
}

function nonSystemSubtype(raw: unknown): SegmentTermination {
  if (raw === "wall") return { kind: "non_system", subtype: "wall" };
  if (raw === "pillar" || raw === "non_system_post") {
    return { kind: "non_system", subtype: "post" };
  }
  return { kind: "non_system", subtype: "other" };
}

function cornerAngle(
  vars: Variables | undefined,
  side: "left" | "right",
  fallback: number,
): number {
  const key =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
      : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
  const value = Number(vars?.[key] ?? fallback);
  return Number.isFinite(value) && value !== 0 ? value : fallback;
}

function terminationFromVariables(
  vars: Variables | undefined,
  side: "left" | "right",
  fallbackCornerAngle: number,
): SegmentTermination | null {
  const kindKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftKind
      : SEGMENT_TERMINATION_KEYS.rightKind;
  const subtypeKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
      : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;

  const kind = vars?.[kindKey];
  if (kind === "system_post") return { kind: "system" };
  if (kind === "non_system_termination") return nonSystemSubtype(vars?.[subtypeKey]);
  if (kind === "corner") {
    return {
      kind: "system_corner",
      angleDeg: cornerAngle(vars, side, fallbackCornerAngle),
    };
  }
  return null;
}

function cornerAngleFromRun(run: CanonicalRun, segmentId: string): number | null {
  const corner = run.corners?.find((item) => item.afterSegmentId === segmentId);
  if (!corner) return null;
  if (corner.type === "135") return 135;
  if (corner.type === "custom") return 90;
  return 90;
}

function previousCornerAngle(run: CanonicalRun, segments: CanonicalSegment[], index: number): number | null {
  if (index <= 0) return null;
  return cornerAngleFromRun(run, segments[index - 1].segmentId);
}

function defaultLeftTermination(
  run: CanonicalRun,
  segments: CanonicalSegment[],
  index: number,
): SegmentTermination {
  const previousCorner = previousCornerAngle(run, segments, index);
  if (previousCorner) return { kind: "system_corner", angleDeg: previousCorner };
  if (index === 0) return boundaryToTermination(run.leftBoundary);
  return { kind: "segment_join" };
}

function defaultRightTermination(
  run: CanonicalRun,
  segments: CanonicalSegment[],
  index: number,
): SegmentTermination {
  const rightCorner = cornerAngleFromRun(run, segments[index].segmentId);
  if (rightCorner) return { kind: "system_corner", angleDeg: rightCorner };
  if (index === segments.length - 1) return boundaryToTermination(run.rightBoundary);
  return { kind: "segment_join" };
}

function segmentProductCode(
  payload: CanonicalPayload,
  run: CanonicalRun,
  segment: CanonicalSegment,
): string {
  if (segment.segmentKind === "gate_opening") {
    return segment.productCode ?? segment.gateProductCode ?? "QS_GATE";
  }
  const variableProduct = segment.variables?.product_code;
  return String(segment.productCode ?? variableProduct ?? run.productCode ?? payload.productCode);
}

function segmentKindForEngine(segment: CanonicalSegment): "fence" | "gate" {
  if (segment.kind === "gate" || segment.segmentKind === "gate_opening") return "gate";
  return "fence";
}

function adaptRun(payload: CanonicalPayload, run: CanonicalRun): CanonicalRun {
  const sortedSegments = [...run.segments].sort((a, b) => a.sortOrder - b.sortOrder);
  const adaptedById = new Map<string, CanonicalSegment>();

  sortedSegments.forEach((segment, index) => {
    const leftFallback = defaultLeftTermination(run, sortedSegments, index);
    const rightFallback = defaultRightTermination(run, sortedSegments, index);
    const leftTermination =
      segment.leftTermination ??
      terminationFromVariables(
        segment.variables,
        "left",
        leftFallback.kind === "system_corner" ? leftFallback.angleDeg : 90,
      ) ??
      leftFallback;
    const rightTermination =
      segment.rightTermination ??
      terminationFromVariables(
        segment.variables,
        "right",
        rightFallback.kind === "system_corner" ? rightFallback.angleDeg : 90,
      ) ??
      rightFallback;

    adaptedById.set(segment.segmentId, {
      ...segment,
      kind: segmentKindForEngine(segment),
      productCode: segmentProductCode(payload, run, segment),
      leftTermination,
      rightTermination,
    });
  });

  return {
    ...run,
    productCode: run.productCode ?? payload.productCode,
    segments: run.segments.map((segment) => adaptedById.get(segment.segmentId) ?? segment),
  };
}

export function prepareBomCalculatorPayload(payload: CanonicalPayload): CanonicalPayload {
  return {
    ...payload,
    runs: payload.runs.map((run) => adaptRun(payload, run)),
  };
}
