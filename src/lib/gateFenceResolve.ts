/**
 * Resolve QS_GATE segment variables from merged fence job+run context when
 * "match gate to fence" is enabled — no sentinel strings in the payload.
 */

export const GATE_HEIGHT_MIN_MM = 600;
export const GATE_HEIGHT_MAX_MM = 2100;

/** Job-scope keys copied from fence context into gate segment vars when matching. */
export const MATCH_FENCE_JOB_KEYS = [
  "finish_type",
  "colour_code",
  "slat_size_mm",
  "slat_gap_mm",
] as const;

export type MatchFenceJobKey = (typeof MATCH_FENCE_JOB_KEYS)[number];

export function mergeFenceJobRun(
  job: Record<string, string | number | boolean> | undefined,
  run: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> {
  return { ...(job ?? {}), ...(run ?? {}) };
}

export function clampGateHeightMm(mm: number): number {
  return Math.min(
    GATE_HEIGHT_MAX_MM,
    Math.max(GATE_HEIGHT_MIN_MM, Math.round(mm)),
  );
}

/**
 * Prefer the taller of job target height and max fence segment height on the run,
 * then clamp to QS_GATE validation band.
 */
export function resolveMatchFenceGateHeightMm(
  fenceCtx: Record<string, string | number | boolean>,
  maxFenceSegmentHeightMm: number | undefined,
): number {
  const jobH = Number(fenceCtx.target_height_mm);
  const segMax =
    maxFenceSegmentHeightMm != null && maxFenceSegmentHeightMm > 0
      ? maxFenceSegmentHeightMm
      : 0;
  const jobOk = Number.isFinite(jobH) && jobH > 0 ? jobH : 0;
  let h = Math.max(jobOk, segMax);
  if (h <= 0) h = 1800;
  return clampGateHeightMm(h);
}

export function resolveMatchFenceJobStyle(
  fenceCtx: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const finish =
    (fenceCtx.finish_type as string | undefined) ?? "standard";
  const colour =
    (fenceCtx.colour_code as string | undefined) ?? "B";
  const slatSize = Number(fenceCtx.slat_size_mm ?? 65);
  const gap = Number(fenceCtx.slat_gap_mm ?? 5);
  return {
    finish_type: finish,
    colour_code: colour,
    slat_size_mm: Number.isFinite(slatSize) ? slatSize : 65,
    slat_gap_mm: Number.isFinite(gap) ? gap : 5,
  };
}

/** All resolved keys written into gate segment variables when matching fence. */
export function resolveMatchFenceSegmentVars(
  fenceCtx: Record<string, string | number | boolean>,
  maxFenceSegmentHeightMm: number | undefined,
): Record<string, string | number | boolean> {
  return {
    ...resolveMatchFenceJobStyle(fenceCtx),
    gate_height_mm: resolveMatchFenceGateHeightMm(
      fenceCtx,
      maxFenceSegmentHeightMm,
    ),
  };
}

function numEq(a: unknown, b: unknown): boolean {
  return Number(a) === Number(b);
}

function strEq(a: unknown, b: unknown): boolean {
  return String(a ?? "") === String(b ?? "");
}

/** Infer whether stored segment vars match current fence-derived resolution (for checkbox state). */
export function gateStoredVarsMatchFence(
  segVars: Record<string, string | number | boolean>,
  fenceCtx: Record<string, string | number | boolean>,
  maxFenceSegmentHeightMm: number | undefined,
): boolean {
  const resolved = resolveMatchFenceSegmentVars(
    fenceCtx,
    maxFenceSegmentHeightMm,
  );
  for (const k of MATCH_FENCE_JOB_KEYS) {
    if (!strEq(segVars[k], resolved[k])) return false;
  }
  if (!numEq(segVars.gate_height_mm, resolved.gate_height_mm)) return false;
  return true;
}
