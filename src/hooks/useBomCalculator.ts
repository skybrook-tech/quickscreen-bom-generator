import { useMutation } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateLocalBom } from '../lib/localBomCalculator';
import type { CanonicalPayload } from '../types/canonical.types';
import type { PricingTier } from '../types/bom.types';

export function useBomCalculator() {
  return useMutation({
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: PricingTier }) => {
      if (!isSupabaseConfigured) {
        return calculateLocalBom(payload, pricingTier ?? 'tier1');
      }

      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload, pricingTier },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });
}
