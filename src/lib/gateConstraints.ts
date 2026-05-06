import type { CanonicalSegment } from "../types/canonical.types";
import { GATE_SEGMENT_STUB_KEYS } from "./segmentTermination";
import { gateMovementOrDefault, type GateBuild, type GateMovement } from "./gateOptionRules";

export type GateConstraintType =
  | "pedestrian-horizontal"
  | "pedestrian-vertical"
  | "sliding-horizontal"
  | "sliding-vertical";

export const GATE_MAX_WIDTH_MM = {
  "pedestrian-horizontal": 2100,
  "pedestrian-vertical": 1200,
  "sliding-horizontal": 6150,
  "sliding-vertical": 6166,
} as const;

export type GateWidthValidation = {
  gateType: GateConstraintType;
  maxWidthMm: number;
  widthMm: number;
  status: "ok" | "warning" | "error";
  alternative?: GateConstraintType;
  message?: string;
};

export function gateConstraintTypeFromSegment(segment: CanonicalSegment): GateConstraintType {
  const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const build = String(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateBuild] ?? "");
  const vertical = build.includes("vertical");
  if (movement === "sliding") return vertical ? "sliding-vertical" : "sliding-horizontal";
  return vertical ? "pedestrian-vertical" : "pedestrian-horizontal";
}

export function getMaxGateWidth(gateType: GateConstraintType): number {
  return GATE_MAX_WIDTH_MM[gateType];
}

export function gateTypeLabel(gateType: GateConstraintType): string {
  return gateType.replace("-", " ");
}

export function getGateWidthAlternative(
  gateType: GateConstraintType,
  widthMm: number,
): GateConstraintType | undefined {
  if (gateType === "pedestrian-horizontal") {
    return widthMm <= GATE_MAX_WIDTH_MM["sliding-horizontal"] ? "sliding-horizontal" : undefined;
  }
  if (gateType === "pedestrian-vertical") {
    if (widthMm <= GATE_MAX_WIDTH_MM["pedestrian-horizontal"]) return "pedestrian-horizontal";
    return widthMm <= GATE_MAX_WIDTH_MM["sliding-vertical"] ? "sliding-vertical" : undefined;
  }
  return undefined;
}

export function validateGateWidth(segment: CanonicalSegment): GateWidthValidation {
  const gateType = gateConstraintTypeFromSegment(segment);
  const maxWidthMm = getMaxGateWidth(gateType);
  const widthMm = Number(segment.segmentWidthMm ?? 0);
  const alternative = getGateWidthAlternative(gateType, widthMm);
  if (!Number.isFinite(widthMm) || widthMm <= maxWidthMm) {
    return { gateType, maxWidthMm, widthMm, status: "ok", alternative };
  }
  const typeLabel = gateTypeLabel(gateType);
  if (gateType.startsWith("sliding")) {
    return {
      gateType,
      maxWidthMm,
      widthMm,
      status: "error",
      alternative,
      message: `Cannot exceed ${maxWidthMm}mm for ${typeLabel}.`,
    };
  }
  if (widthMm <= maxWidthMm * 1.1) {
    return {
      gateType,
      maxWidthMm,
      widthMm,
      status: "warning",
      alternative,
      message: `This is over the ${typeLabel} maximum of ${maxWidthMm}mm.${alternative ? ` The closest catalogue match is a ${gateTypeLabel(alternative)} gate.` : ""}`,
    };
  }
  return {
    gateType,
    maxWidthMm,
    widthMm,
    status: "error",
    alternative,
    message: `Cannot exceed ${maxWidthMm}mm for ${typeLabel}.${alternative ? ` Did you mean ${gateTypeLabel(alternative)}?` : ""}`,
  };
}

export function gatePatchForAlternative(
  alternative: GateConstraintType,
  currentMovement: GateMovement,
): Record<string, string | number | boolean> {
  const movement: GateMovement = alternative.startsWith("sliding") ? "sliding" : currentMovement;
  const build: GateBuild =
    alternative === "sliding-vertical"
      ? "qsg_sliding_vertical"
      : alternative === "sliding-horizontal"
        ? "qsg_sliding_horizontal"
        : alternative === "pedestrian-vertical"
          ? "qsg_hinged_vertical"
          : "qsg_hinged_horizontal";
  return {
    [GATE_SEGMENT_STUB_KEYS.gateMovement]: movement,
    [GATE_SEGMENT_STUB_KEYS.gateBuild]: build,
    [GATE_SEGMENT_STUB_KEYS.openingDirection]: movement === "sliding" ? "right" : "out",
    [GATE_SEGMENT_STUB_KEYS.leafCount]: movement === "double_swing" ? 2 : 1,
    [GATE_SEGMENT_STUB_KEYS.dropBoltType]: movement === "double_swing" ? "SS-0300DB-B" : "none",
    [GATE_SEGMENT_STUB_KEYS.hingeType]: movement === "sliding" ? "none" : "TC-H-AT-HD-B",
    [GATE_SEGMENT_STUB_KEYS.latchType]: movement === "sliding" ? "none" : "LL-DL-KA",
    [GATE_SEGMENT_STUB_KEYS.gateStopType]: "none",
    [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
    [GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit]: false,
  };
}
