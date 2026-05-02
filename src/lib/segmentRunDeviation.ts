import type { CanonicalRun, CanonicalSegment } from "../types/canonical.types";

/** Variable keys ignored when comparing segment effective merge vs job+run baseline (height stack). */
export const SEGMENT_RUN_DEVIATION_EXCLUDED_KEYS = new Set([
  "target_height_mm",
]);

export interface SegmentRunDeviation {
  fieldKey: string;
  baselineValue: unknown;
  effectiveValue: unknown;
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null && b == null) return true;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return Boolean(a) === Boolean(b);
  }
  const na = Number(a),
    nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return String(a) === String(b);
}

function formatScalar(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

/**
 * Effective merge: job → run → segment variables.
 * Baseline merge: job → run only.
 * Also flags segment.productCode when it differs from run.productCode ?? payload productCode.
 */
export function computeSegmentRunSettingDeviations(
  payloadProductCode: string | undefined,
  jobVars: Record<string, string | number | boolean>,
  run: CanonicalRun | undefined,
  seg: CanonicalSegment,
): SegmentRunDeviation[] {
  const baseline: Record<string, string | number | boolean> = {
    ...jobVars,
    ...(run?.variables ?? {}),
  };
  const effective: Record<string, string | number | boolean> = {
    ...jobVars,
    ...(run?.variables ?? {}),
    ...(seg.variables ?? {}),
  };

  const keys = new Set([
    ...Object.keys(baseline),
    ...Object.keys(effective),
  ]);

  const out: SegmentRunDeviation[] = [];

  for (const key of keys) {
    if (SEGMENT_RUN_DEVIATION_EXCLUDED_KEYS.has(key)) continue;

    const b = baseline[key];
    const e = effective[key];
    if (valuesEqual(b, e)) continue;

    out.push({
      fieldKey: key,
      baselineValue: b,
      effectiveValue: e,
    });
  }

  const expectedProduct =
    run?.productCode ?? payloadProductCode ?? undefined;
  if (
    expectedProduct != null &&
    seg.productCode !== expectedProduct
  ) {
    out.push({
      fieldKey: "productCode",
      baselineValue: expectedProduct,
      effectiveValue: seg.productCode,
    });
  }

  return out;
}

export function formatDeviationLine(
  d: SegmentRunDeviation,
  labelForKey: (fieldKey: string) => string,
): string {
  const label =
    d.fieldKey === "productCode"
      ? "Product code"
      : labelForKey(d.fieldKey);
  return `${label}: ${formatScalar(d.effectiveValue)} (run default: ${formatScalar(d.baselineValue)})`;
}
