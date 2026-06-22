import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CanonicalPayload, CanonicalRun, CanonicalSegment } from '../types/canonical.types';
import type { PricingTier } from '../types/bom.types';
import { calculateCustomBOM } from '../lib/customBOMCalculator';
import { isCustomCalculator } from '../lib/customCalculators';

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

/**
 * @param embedOrgSlug When set (anon embed route), the BOM is calculated without
 *   a user session: the request carries the org slug and the edge function gates
 *   on `embed_enabled` and forces retail pricing. Off the embed route this is
 *   undefined and a signed-in session is required as before.
 */
export function useBomCalculator(embedOrgSlug?: string) {
  return useMutation({
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: PricingTier }) => {
      const calculatorPayload = expandSectionSystemOverrides(payload);

      if (isCustomCalculator(payload.productCode)) {
        return calculateCustomBOM(calculatorPayload, pricingTier) as unknown as Record<string, unknown>;
      }

      if (embedOrgSlug) {
        // Anonymous embed: no session. supabase-js sends the anon key as the
        // Authorization/apikey, which passes the gateway; the edge function
        // resolves the org from embedOrgSlug instead of a JWT profile.
        const { data, error } = await supabase.functions.invoke('bom-calculator-static', {
          body: { payload: calculatorPayload, embedOrgSlug },
        });
        if (error || !data || isEdgeFailurePayload(data)) {
          throw new Error('BOM calculation failed — please try again');
        }
        return data as Record<string, unknown>;
      }

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
