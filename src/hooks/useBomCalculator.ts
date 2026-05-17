import { useMutation } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateLocalBom } from '../lib/localBomCalculator';
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from '../types/canonical.types';
import type { PricingTier } from '../types/bom.types';

function expandSectionSystemOverrides(payload: CanonicalPayload): CanonicalPayload {
  const runs: CanonicalRun[] = [];
  let changed = false;

  for (const run of payload.runs) {
    const baseSegments: CanonicalSegment[] = [];
    const overrideGroups = new Map<string, CanonicalSegment[]>();

    for (const segment of run.segments) {
      if (segment.segmentKind === 'gate_opening') {
        baseSegments.push(segment);
        continue;
      }
      const segmentProductCode = String(segment.variables?.product_code ?? run.productCode);
      if (segmentProductCode === run.productCode) {
        baseSegments.push(segment);
        continue;
      }
      changed = true;
      overrideGroups.set(segmentProductCode, [
        ...(overrideGroups.get(segmentProductCode) ?? []),
        segment,
      ]);
    }

    if (baseSegments.length > 0) {
      runs.push({ ...run, segments: baseSegments });
    }

    for (const [productCode, segments] of overrideGroups) {
      runs.push({
        ...run,
        runId: `${run.runId}-${productCode.toLowerCase()}`,
        productCode,
        segments,
        corners: [],
      });
    }
  }

  return changed ? { ...payload, runs } : payload;
}

export function useBomCalculator() {
  return useMutation({
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: PricingTier }) => {
      const tier = pricingTier ?? 'tier1';
      const calculatorPayload = expandSectionSystemOverrides(payload);
      if (!isSupabaseConfigured) {
        return calculateLocalBom(calculatorPayload, tier);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return calculateLocalBom(calculatorPayload, tier);

      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload: calculatorPayload, pricingTier: tier },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) return calculateLocalBom(calculatorPayload, tier);
      return data as Record<string, unknown>;
    },
  });
}
