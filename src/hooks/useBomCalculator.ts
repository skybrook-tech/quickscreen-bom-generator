import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { CanonicalPayload } from '../types/canonical.types';

export function useBomCalculator() {
  return useMutation({
    mutationFn: async ({ payload, pricingTier }: { payload: CanonicalPayload; pricingTier?: string }) => {
      const { data, error } = await supabase.functions.invoke('bom-calculator', {
        body: { payload, pricingTier },
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
  });
}
