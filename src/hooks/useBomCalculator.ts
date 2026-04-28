import { useMutation } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { calculateLocalBom } from '../lib/localBomCalculator';
import type { CanonicalPayload } from '../types/canonical.types';
import type { PricingTier } from '../types/bom.types';

export function useBomCalculator() {
  return useMutation({
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: PricingTier }) => {
      const tier = pricingTier ?? 'tier1';
      if (!isSupabaseConfigured) {
        return calculateLocalBom(payload, tier);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return calculateLocalBom(payload, tier);

      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload, pricingTier: tier },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) return calculateLocalBom(payload, tier);
      return data as Record<string, unknown>;
    },
  });
}
