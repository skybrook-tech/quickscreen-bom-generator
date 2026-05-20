import type { BOMResult } from '../types/bom.types';

/** Maps persisted quotes.bom (BOMResult) to the edge-function shape CalculatorV3Content reads. */
export function savedBomToEngineResult(
  bom: BOMResult | null | undefined,
  fallbackGeneratedAt?: string,
): Record<string, unknown> | null {
  const lines = bom?.fenceItems ?? [];
  if (lines.length === 0 && !(bom?.gateItems?.length)) {
    return null;
  }
  return {
    lines,
    gateItems: bom?.gateItems ?? [],
    pricingTier: bom?.pricingTier ?? 'tier1',
    generatedAt: bom?.generatedAt ?? fallbackGeneratedAt ?? new Date().toISOString(),
    warnings: [],
    errors: [],
    assumptions: [],
  };
}
