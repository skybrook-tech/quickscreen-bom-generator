import type { CanonicalSegment } from "../types/canonical.types";
import type { UiCalculatorConfig } from "../types/calculatorConfig.types";
import { GATE_SEGMENT_STUB_KEYS } from "./segmentTermination";
import { gateMovementOrDefault, type GateBuild, type GateMovement } from "./gateOptionRules";

export type GateConstraintType =
  | "pedestrian-horizontal"
  | "pedestrian-vertical"
  | "sliding-horizontal"
  | "sliding-vertical";

// Fallback used only if a QS_GATE CalculatorConfig isn't available yet — the
// real values come from config.gateRules (get-calculator-config), see
// useCalculatorConfig's fallbackConfig for the offline mirror of these.
export const GATE_MAX_WIDTH_MM = {
  "pedestrian-horizontal": 2100,
  "pedestrian-vertical": 2100,
  "sliding-horizontal": 6150,
  "sliding-vertical": 6166,
} as const;

const DOUBLE_SWING_MAX_LEAF_WIDTH_MM = 2100;

function maxWidthMmFor(gateType: GateConstraintType, config?: UiCalculatorConfig): number {
  if (!config) return GATE_MAX_WIDTH_MM[gateType];
  switch (gateType) {
    case "pedestrian-horizontal": return config.gateRules.maxWidthMm.pedestrianHorizontal;
    case "pedestrian-vertical": return config.gateRules.maxWidthMm.pedestrianVertical;
    case "sliding-horizontal": return config.gateRules.maxWidthMm.slidingHorizontal;
    case "sliding-vertical": return config.gateRules.maxWidthMm.slidingVertical;
  }
}

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

export function getMaxGateWidth(gateType: GateConstraintType, config?: UiCalculatorConfig): number {
  return maxWidthMmFor(gateType, config);
}

export function gateTypeLabel(gateType: GateConstraintType): string {
  return gateType.replace("-", " ");
}

export function getGateWidthAlternative(
  gateType: GateConstraintType,
  widthMm: number,
  config?: UiCalculatorConfig,
): GateConstraintType | undefined {
  if (gateType === "pedestrian-horizontal") {
    return widthMm <= maxWidthMmFor("sliding-horizontal", config) ? "sliding-horizontal" : undefined;
  }
  if (gateType === "pedestrian-vertical") {
    if (widthMm <= maxWidthMmFor("pedestrian-horizontal", config)) return "pedestrian-horizontal";
    return widthMm <= maxWidthMmFor("sliding-vertical", config) ? "sliding-vertical" : undefined;
  }
  return undefined;
}

export function validateGateWidth(segment: CanonicalSegment, config?: UiCalculatorConfig): GateWidthValidation {
  const gateType = gateConstraintTypeFromSegment(segment);
  const movement = gateMovementOrDefault(segment.variables?.[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  const doubleSwingMaxLeafWidthMm = config?.gateRules.doubleSwingMaxLeafWidthMm ?? DOUBLE_SWING_MAX_LEAF_WIDTH_MM;
  const maxWidthMm =
    movement === "double_swing"
      ? doubleSwingMaxLeafWidthMm * 2
      : getMaxGateWidth(gateType, config);
  const widthMm = Number(segment.segmentWidthMm ?? 0);
  const alternative = getGateWidthAlternative(gateType, widthMm, config);
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
  if (movement === "double_swing") {
    return {
      gateType,
      maxWidthMm,
      widthMm,
      status: "error",
      alternative,
      message: `Each leaf must be <= ${doubleSwingMaxLeafWidthMm}mm. Reduce the opening or switch to Sliding.`,
    };
  }
  return {
    gateType,
    maxWidthMm,
    widthMm,
    status: "error",
    alternative,
    message: `Pedestrian gate width above ${maxWidthMm}mm - try Double swing (2 leaves) or Sliding.`,
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
    [GATE_SEGMENT_STUB_KEYS.slidingTrackType]: "XPSG-6000-TRACK-ST",
    [GATE_SEGMENT_STUB_KEYS.slidingGuideType]: "XPSG-GUIDE",
    [GATE_SEGMENT_STUB_KEYS.slidingCatchType]: "XPSG-CATCH-U",
    [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
    [GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit]: false,
  };
}
