/**
 * Per-segment junction terminations live in `segment.variables` with stable keys.
 * Maps UI buckets to legacy `CanonicalBoundary.type` values consumed by QSHS rules.
 */
import type { CanonicalSegment } from "../types/canonical.types";

export const CORNER_DEGREE_OPTIONS = [90, 135] as const;

export type TerminationKindUi =
  | "corner"
  | "system_post"
  | "non_system_termination";

export type NonSystemSubtypeUi = "wall" | "pillar" | "void" | "non_system_post";

/** Legacy engine / boundary enum (matches CanonicalBoundary.type). */
export type LegacyBoundaryType =
  | "product_post"
  | "brick_post"
  | "existing_post"
  | "wall"
  | "corner_90";

export const SEGMENT_TERMINATION_KEYS = {
  leftKind: "left_termination_kind",
  leftCornerDegrees: "left_corner_degrees",
  leftCornerMeasuredDegrees: "left_corner_measured_degrees",
  leftCornerType: "left_corner_type",
  leftCornerManual: "left_corner_manual",
  leftNonSystemSubtype: "left_non_system_subtype",
  rightKind: "right_termination_kind",
  rightCornerDegrees: "right_corner_degrees",
  rightCornerMeasuredDegrees: "right_corner_measured_degrees",
  rightCornerType: "right_corner_type",
  rightCornerManual: "right_corner_manual",
  rightNonSystemSubtype: "right_non_system_subtype",
} as const;

/** Optional segment variables for fence geometry / posts (expand panel). */
export const SEGMENT_OPTION_KEYS = {
  postSize: "post_size",
  postWidthMm: "post_width_mm",
} as const;

/** Gate segment variables used by the v3 run-embedded gate workflow. */
export const GATE_SEGMENT_STUB_KEYS = {
  gateMovement: "gate_movement",
  gateBuild: "gate_build",
  leafCount: "leaf_count",
  leaf1WidthMm: "leaf_1_width_mm",
  leaf2WidthMm: "leaf_2_width_mm",
  matchRunHeight: "match_run_height",
  gateHeightMm: "gate_height_mm",
  colourCode: "colour_code",
  slatSizeMm: "slat_size_mm",
  slatGapMm: "slat_gap_mm",
  hingeType: "hinge_type",
  latchType: "latch_type",
  dropBoltType: "drop_bolt_type",
  gateStopType: "gate_stop_type",
  hardwareKitSku: "hardware_kit_sku",
  includeExternalAccessKit: "include_external_access_kit",
  includeLockBox: "include_lock_box",
  lockBoxType: "lock_box_type",
  useGatePostsAsFenceTermination: "use_gate_posts_as_fence_termination",
  openingDirection: "opening_direction",
  slidingSide: "sliding_side",
  hingeSide: "hinge_side",
  slidingTrackType: "sliding_track_type",
  slidingGuideType: "sliding_guide_type",
  slidingCatchType: "sliding_catch_type",
  slidingMotorType: "sliding_motor_type",
  automationEnabled: "automation_enabled",
  automationPowerSource: "automation_power_source",
  automationCableDistanceM: "automation_cable_distance_m",
  automationBattery: "automation_battery",
  automationKeypad: "automation_keypad",
  automationExtraRemotes: "automation_extra_remotes",
  gatePostSizeMm: "gate_post_size_mm",
} as const;

export function parseTerminationKind(
  raw: unknown,
): TerminationKindUi | undefined {
  if (
    raw === "corner" ||
    raw === "system_post" ||
    raw === "non_system_termination"
  )
    return raw;
  return undefined;
}

export function parseNonSystemSubtype(
  raw: unknown,
): NonSystemSubtypeUi | undefined {
  if (raw === "wall" || raw === "pillar" || raw === "void" || raw === "non_system_post") return raw;
  return undefined;
}

/**
 * Resolve effective legacy boundary type for one side of a segment.
 * Falls back to the run boundary when segment termination is not set.
 */
export function effectiveLegacyBoundaryType(
  runBoundaryType: LegacyBoundaryType,
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): LegacyBoundaryType {
  const kindKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftKind
      : SEGMENT_TERMINATION_KEYS.rightKind;
  const kind = parseTerminationKind(vars?.[kindKey]);

  if (!kind) return runBoundaryType;

  if (kind === "system_post") return "product_post";
  if (kind === "corner") return "corner_90";

  // Wall, existing post, pillar, and void all use the same F-section
  // attachment path in the BOM rather than emitting a product post.
  return "wall";
}

export function patchSegmentVariables(
  seg: CanonicalSegment,
  patch: Record<string, string | number | boolean | null | undefined>,
): CanonicalSegment {
  const next: Record<string, string | number | boolean> = {
    ...(seg.variables ?? {}),
  };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") delete next[k];
    else next[k] = v;
  }
  return { ...seg, variables: Object.keys(next).length ? next : undefined };
}

export function cornerDegreesFromVars(
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): number | undefined {
  const key =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftCornerDegrees
      : SEGMENT_TERMINATION_KEYS.rightCornerDegrees;
  const raw = vars?.[key];
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export type CornerType = "right" | "obtuse" | "custom";

export function classifyCorner(angleDeg: number): CornerType {
  if (Math.abs(angleDeg - 90) <= 2) return "right";
  if (Math.abs(angleDeg - 135) <= 5) return "obtuse";
  return "custom";
}

export function cornerTypeFromVars(
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): CornerType | undefined {
  const typeKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftCornerType
      : SEGMENT_TERMINATION_KEYS.rightCornerType;
  const rawType = vars?.[typeKey];
  if (rawType === "right" || rawType === "obtuse" || rawType === "custom") return rawType;

  const degrees = cornerDegreesFromVars(vars, side);
  return degrees === undefined ? undefined : classifyCorner(degrees);
}
