import { GATE_SEGMENT_STUB_KEYS } from "./segmentTermination";

export type GateMovement = "single_swing" | "double_swing" | "sliding";
export type GateBuild =
  | "qsg_hinged_horizontal"
  | "qsg_hinged_vertical"
  | "qsg_sliding_horizontal"
  | "qsg_sliding_vertical";

export type GateOption = {
  value: string;
  label: string;
  sku?: string;
  description?: string;
  movements?: GateMovement[];
};

export const GATE_MOVEMENTS: GateOption[] = [
  {
    value: "single_swing",
    label: "Single swing",
  },
  {
    value: "double_swing",
    label: "Double swing",
  },
  {
    value: "sliding",
    label: "Sliding",
  },
];

export const GATE_BUILDS: GateOption[] = [
  {
    value: "qsg_hinged_horizontal",
    label: "QSG hinged horizontal",
    movements: ["single_swing", "double_swing"],
  },
  {
    value: "qsg_hinged_vertical",
    label: "QSG hinged vertical",
    movements: ["single_swing", "double_swing"],
  },
  {
    value: "qsg_sliding_horizontal",
    label: "QSG sliding horizontal",
    movements: ["sliding"],
  },
  {
    value: "qsg_sliding_vertical",
    label: "QSG sliding vertical",
    movements: ["sliding"],
  },
];

export const HINGE_OPTIONS: GateOption[] = [
  { value: "ML-TL-KF-H-FT", label: "Magna Latch + Kwik Fit fixed hinge", sku: "ML-TL-KF-H-FT" },
  { value: "ML-TL-TC-H-AT", label: "Magna Latch + TruClose adjustable hinge", sku: "ML-TL-TC-H-AT" },
  { value: "KF-AH-AT", label: "D&D Kwik Fit aluminium adjustable hinge", sku: "KF-AH-AT" },
  { value: "KF-H-FT", label: "D&D Kwik Fit fixed hinge pair", sku: "KF-H-FT" },
  { value: "KF-H-NT", label: "D&D Kwik Fit no-tension hinge pair", sku: "KF-H-NT" },
  { value: "TC-H-AT-B", label: "D&D TruClose adjustable hinge - black", sku: "TC-H-AT-B" },
  { value: "TC-H-AT-2L-B", label: "D&D TruClose two-leg adjustable hinge - black", sku: "TC-H-AT-2L-B" },
  { value: "TC-H-AT-HD-B", label: "D&D TruClose heavy duty hinge - black", sku: "TC-H-AT-HD-B" },
  { value: "TC-H-AT-HD-2L-B", label: "D&D TruClose heavy duty two-leg hinge - black", sku: "TC-H-AT-HD-2L-B" },
  { value: "SURECLOSE-HH", label: "D&D SureClose hydraulic closer hinge", sku: "SURECLOSE-HH" },
  { value: "SURECLOSE-NSC", label: "D&D SureClose non self-closing hinge", sku: "SURECLOSE-NSC" },
  { value: "SS-BH10075-B", label: "Six Star 100x75 butt hinge - black", sku: "SS-BH10075-B" },
  { value: "ZF-BBH-L", label: "Zeus ball bearing hinge - left", sku: "ZF-BBH-L" },
  { value: "ZF-BBH-R", label: "Zeus ball bearing hinge - right", sku: "ZF-BBH-R" },
  { value: "CB-HINGE-B-2PK", label: "Colourbond hinge pair - black", sku: "CB-HINGE-B-2PK" },
  { value: "KF-AH-AT-W", label: "D&D Kwik Fit aluminium adjustable hinge - white", sku: "KF-AH-AT-W" },
  { value: "TC-H-AT-2L-W", label: "D&D TruClose two-leg adjustable hinge - white", sku: "TC-H-AT-2L-W" },
  { value: "TC-H-AT-HD-2L-W", label: "D&D TruClose heavy duty two-leg hinge - white", sku: "TC-H-AT-HD-2L-W" },
  { value: "none", label: "No hinge kit" },
];

export const LATCH_OPTIONS: GateOption[] = [
  { value: "ML-TL", label: "Magna Latch top pull", sku: "ML-TL" },
  { value: "ML-TL-W", label: "Magna Latch top pull - white", sku: "ML-TL-W" },
  { value: "LL-DL", label: "Lokk Latch Deluxe keyed different", sku: "LL-DL" },
  { value: "LL-DL-KA", label: "Lokk Latch Deluxe keyed alike", sku: "LL-DL-KA" },
  { value: "LL-DL-W", label: "Lokk Latch Deluxe - white", sku: "LL-DL-W" },
  { value: "LLAA", label: "Lokk Latch general purpose lockable", sku: "LLAA" },
  { value: "LLAA-W", label: "Lokk Latch general purpose lockable - white", sku: "LLAA-W" },
  { value: "LLB", label: "External access kit for LLAA", sku: "LLB" },
  { value: "T-L", label: "D&D T-Latch padlockable", sku: "T-L" },
  { value: "SS-DL-B", label: "Six Star D latch and striker - black", sku: "SS-DL-B" },
  { value: "MR-FMLSL", label: "Magna Latch side-pull latch", sku: "MR-FMLSL" },
  { value: "LL-GH", label: "D&D Lokk Latch gate handle", sku: "LL-GH" },
  { value: "none", label: "No latch" },
];

export const DROP_BOLT_OPTIONS: GateOption[] = [
  { value: "none", label: "No drop bolt" },
  { value: "QB124", label: "D&D Q-Bolt 610mm padlockable", sku: "QB124" },
  { value: "LB-PL", label: "D&D Lokk Bolt 450mm lockable", sku: "LB-PL" },
  { value: "ZF-DB400-B", label: "Zeus 400mm drop bolt - black", sku: "ZF-DB400-B" },
  { value: "SS-0300DB-B", label: "300mm drop bolt - black", sku: "SS-0300DB-B" },
];

export const GATE_STOP_OPTIONS: GateOption[] = [
  { value: "none", label: "No gate stop" },
  { value: "SS-GS", label: "D&D gate stop", sku: "SS-GS" },
  { value: "SS-GS-SLIMLINE", label: "Slimline gate stop", sku: "SS-GS-SLIMLINE" },
];

export const SLIDING_TRACK_OPTIONS: GateOption[] = [
  { value: "XPSG-3000-TRACK-ST", label: "Steel bolt-down track 3000mm", sku: "XPSG-3000-TRACK-ST" },
  { value: "XPSG-6000-TRACK-ST", label: "Steel bolt-down track 6000mm", sku: "XPSG-6000-TRACK-ST" },
  { value: "XPSG-6000-TRACK-AL", label: "Aluminium bolt-down track 6000mm", sku: "XPSG-6000-TRACK-AL" },
];

export const SLIDING_CATCH_OPTIONS: GateOption[] = [
  { value: "XPSG-CATCH-U", label: "Sliding gate U catch", sku: "XPSG-CATCH-U" },
  { value: "XPSG-CATCH-F", label: "Sliding gate adjustable F catch", sku: "XPSG-CATCH-F" },
];

export const SLIDING_MOTOR_OPTIONS: GateOption[] = [
  { value: "none", label: "No motor kit" },
  { value: "XPSG-FILO-400", label: "FILO 400 Pro motor kit", sku: "XPSG-FILO-400" },
  { value: "XPSG-FILO-400PRO-SP", label: "FILO 400 Pro split-pack motor kit", sku: "XPSG-FILO-400PRO-SP" },
];

export function isGateMovement(value: unknown): value is GateMovement {
  return GATE_MOVEMENTS.some((option) => option.value === value);
}

export function gateMovementOrDefault(value: unknown): GateMovement {
  return isGateMovement(value) ? value : "single_swing";
}

export function isSwingGateMovement(value: GateMovement) {
  return value === "single_swing" || value === "double_swing";
}

export function gateBuildsForMovement(movement: GateMovement) {
  return GATE_BUILDS.filter(
    (option) => !option.movements || option.movements.includes(movement),
  );
}

export function defaultGateBuildForMovement(
  movement: GateMovement,
  vertical = false,
): GateBuild {
  if (movement === "sliding") {
    return vertical ? "qsg_sliding_vertical" : "qsg_sliding_horizontal";
  }
  return vertical ? "qsg_hinged_vertical" : "qsg_hinged_horizontal";
}

export function defaultGateVariables(
  runVariables: Record<string, unknown> = {},
  targetHeightMm = 1800,
) {
  const colour = String(runVariables.colour_code ?? runVariables.colour ?? "B");
  const slatGap = Number(runVariables.slat_gap_mm ?? 9);
  const vertical = runVariables.productCode === "VS";
  const postSize = Number(runVariables.post_size ?? 50);
  return {
    [GATE_SEGMENT_STUB_KEYS.gateMovement]: "single_swing",
    [GATE_SEGMENT_STUB_KEYS.gateBuild]: defaultGateBuildForMovement("single_swing", vertical),
    [GATE_SEGMENT_STUB_KEYS.leafCount]: 1,
    [GATE_SEGMENT_STUB_KEYS.matchRunHeight]: true,
    [GATE_SEGMENT_STUB_KEYS.gateHeightMm]: targetHeightMm,
    [GATE_SEGMENT_STUB_KEYS.colourCode]: colour,
    [GATE_SEGMENT_STUB_KEYS.slatSizeMm]: Number(runVariables.slat_size_mm ?? 65),
    [GATE_SEGMENT_STUB_KEYS.slatGapMm]: slatGap,
    [GATE_SEGMENT_STUB_KEYS.hingeType]: "TC-H-AT-HD-B",
    [GATE_SEGMENT_STUB_KEYS.latchType]: "LL-DL-KA",
    [GATE_SEGMENT_STUB_KEYS.dropBoltType]: "none",
    [GATE_SEGMENT_STUB_KEYS.gateStopType]: "none",
    [GATE_SEGMENT_STUB_KEYS.hardwareKitSku]: "",
    [GATE_SEGMENT_STUB_KEYS.includeExternalAccessKit]: false,
    [GATE_SEGMENT_STUB_KEYS.includeLockBox]: false,
    [GATE_SEGMENT_STUB_KEYS.lockBoxType]: "",
    [GATE_SEGMENT_STUB_KEYS.useGatePostsAsFenceTermination]: true,
    [GATE_SEGMENT_STUB_KEYS.openingDirection]: "out",
    [GATE_SEGMENT_STUB_KEYS.slidingTrackType]: "XPSG-6000-TRACK-ST",
    [GATE_SEGMENT_STUB_KEYS.slidingCatchType]: "XPSG-CATCH-U",
    [GATE_SEGMENT_STUB_KEYS.slidingMotorType]: "none",
    [GATE_SEGMENT_STUB_KEYS.gatePostSizeMm]: postSize,
  };
}

export function optionLabel(options: GateOption[], value: unknown) {
  return options.find((option) => option.value === value)?.label ?? String(value ?? "");
}
