import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from '../types/canonical.types';
import type { PricingTier } from '../types/bom.types';

export function isEdgeFailurePayload(data: unknown): data is { error: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as { error?: unknown }).error === 'string'
  );
}

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
    mutationFn: async ({ payload }: { payload: CanonicalPayload; pricingTier?: PricingTier }) => {
      const calculatorPayload = expandSectionSystemOverrides(payload);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated — please sign in to generate a BOM');

      const { data, error } = await supabase.functions.invoke('bom-calculator-static', {
        body: { payload: calculatorPayload },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data || isEdgeFailurePayload(data)) {
        throw new Error('BOM calculation failed — please try again');
      }
      return data as Record<string, unknown>;
    },
  });
}
