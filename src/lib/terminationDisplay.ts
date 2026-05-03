import type { SegmentTermination } from "../types/canonical.types";

/** Stable JSON comparison for terminations. */
export function terminationEquals(
  a: SegmentTermination,
  b: SegmentTermination,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** `<option>` text in TerminationControl — distinct from chip summaries for corners. */
export function terminationSelectOptionLabel(kindValue: string): string {
  if (kindValue === "system") return "Standard post";
  if (kindValue === "system_corner") return "Corner post";
  if (kindValue === "non_system:wall") return "Wall mount";
  if (kindValue === "non_system:post") return "Non-system post";
  if (kindValue === "non_system:other") return "Other (no post)";
  return kindValue;
}

/** Short label for chips / tooltips. */
export function terminationChipSummary(t: SegmentTermination): string {
  switch (t.kind) {
    case "system":
      return "Standard post";
    case "segment_join":
      return "Straight join";
    case "non_system":
      if (t.subtype === "wall") return "Wall mount";
      if (t.subtype === "post") return "Non-system post";
      return "Other";
    case "system_corner":
      return `${Math.round(Math.abs(t.angleDeg))}° corner`;
    default:
      return String((t as { kind: string }).kind);
  }
}

export function terminationSideTooltip(
  side: "left" | "right",
  t: SegmentTermination,
): string {
  const edge = side === "left" ? "Left" : "Right";
  return `${edge} termination — ${terminationChipSummary(t)}`;
}

/**
 * Straight-run template: outer ends system, inner joins segment_join.
 * Used only to detect user-facing overrides vs this template (not geometry-perfect).
 */
export function expectedFenceTerminationTemplate(
  fenceIndex: number,
  fenceCount: number,
  side: "left" | "right",
): SegmentTermination {
  if (fenceCount <= 0) return { kind: "system" };
  if (side === "left") {
    return fenceIndex === 0
      ? { kind: "system" }
      : { kind: "segment_join" };
  }
  return fenceIndex === fenceCount - 1
    ? { kind: "system" }
    : { kind: "segment_join" };
}

/**
 * Canvas-driven corners use system_corner; template inner joints use segment_join.
 * Those are not treated as "spec overrides" in the collapsed chip row.
 */
export function shouldShowTerminationOverrideChip(
  actual: SegmentTermination,
  expected: SegmentTermination,
): boolean {
  if (terminationEquals(actual, expected)) return false;
  if (
    actual.kind === "system_corner" &&
    expected.kind === "segment_join"
  ) {
    return false;
  }
  if (
    actual.kind === "segment_join" &&
    expected.kind === "system_corner"
  ) {
    return false;
  }
  return true;
}
