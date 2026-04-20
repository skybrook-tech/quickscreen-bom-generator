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

export type NonSystemSubtypeUi = "wall" | "non_system_post";

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
  leftNonSystemSubtype: "left_non_system_subtype",
  rightKind: "right_termination_kind",
  rightCornerDegrees: "right_corner_degrees",
  rightNonSystemSubtype: "right_non_system_subtype",
} as const;

/** Optional segment variables for fence geometry / posts (expand panel). */
export const SEGMENT_OPTION_KEYS = {
  postSize: "post_size",
  postWidthMm: "post_width_mm",
} as const;

/** Gate stub keys until QS_GATE SchemaDrivenForm is wired in expand. */
export const GATE_SEGMENT_STUB_KEYS = {
  hingeType: "hinge_type",
  latchType: "latch_type",
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
  if (raw === "wall" || raw === "non_system_post") return raw;
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

  const subKey =
    side === "left"
      ? SEGMENT_TERMINATION_KEYS.leftNonSystemSubtype
      : SEGMENT_TERMINATION_KEYS.rightNonSystemSubtype;
  const sub = parseNonSystemSubtype(vars?.[subKey]);
  if (sub === "wall") return "wall";
  return "brick_post";
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
