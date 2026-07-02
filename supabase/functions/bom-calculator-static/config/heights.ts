// config/heights.ts — height-ladder derivation for the UI config resolver.
//
// The v3 client renders a height dropdown whose options are the achievable
// fence heights for a given slat size + gap: (slat + gap) * N - gap +
// slatHeightDeductionMm. This is the single server-side source of truth for
// that ladder; `resolveUiConfig` calls `heightEntries` (in optionRules.ts,
// which calls `deriveHeights`) to compute the ladder for the current slat/gap
// and ships it to the client as `config.heightLadder.entries`. The client no
// longer derives heights — it reads the resolved entries.

export type DerivedHeight = { N: number; height: number };

export type HeightRange = {
  minN: number;
  maxN: number;
  minHeight: number;
  maxHeight: number;
};

const DEFAULT_HEIGHT_RANGE: HeightRange = {
  minN: 5,
  maxN: 40,
  minHeight: 300,
  maxHeight: 2400,
};

export function deriveHeights(
  slat: 65 | 90,
  gap: number,
  range: HeightRange = DEFAULT_HEIGHT_RANGE,
  slatHeightDeductionMm = 3,
): DerivedHeight[] {
  const heights: DerivedHeight[] = [];
  for (let N = range.minN; N <= range.maxN; N++) {
    const height = (slat + gap) * N - gap + slatHeightDeductionMm;
    if (height >= range.minHeight && height <= range.maxHeight) {
      heights.push({ N, height });
    }
  }
  return heights;
}

export function nearestDerivedHeight(
  heights: DerivedHeight[],
  requestedHeight: number,
): DerivedHeight | undefined {
  return heights.reduce<DerivedHeight | undefined>((best, item) => {
    if (!best) return item;
    return Math.abs(item.height - requestedHeight) < Math.abs(best.height - requestedHeight)
      ? item
      : best;
  }, undefined);
}

export function derivedHeightForSlatCount(
  heights: DerivedHeight[],
  slatCount: unknown,
): DerivedHeight | undefined {
  const n = Number(slatCount);
  if (!Number.isFinite(n)) return undefined;
  return heights.find((item) => item.N === Math.round(n));
}
