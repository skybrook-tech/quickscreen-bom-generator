export type DerivedHeight = {
  N: number;
  height: number;
};

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
  maxHeight: 3500,
};

export function deriveHeights(
  slat: 65 | 90,
  gap: number,
  range: HeightRange = DEFAULT_HEIGHT_RANGE,
): DerivedHeight[] {
  const heights: DerivedHeight[] = [];
  for (let N = range.minN; N <= range.maxN; N++) {
    const height = (slat + gap) * N - gap + 3;
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
