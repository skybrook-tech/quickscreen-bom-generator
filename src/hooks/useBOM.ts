import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FenceConfig } from '../schemas/fence.schema';
import type { GateConfig } from '../schemas/gate.schema';
import type { BOMResult, PricingTier } from '../types/bom.types';

interface BOMParams {
  fenceConfig: FenceConfig;
  gates: GateConfig[];
  pricingTier: PricingTier;
}

export function useBOM() {
  return useMutation({
    mutationFn: async (params: BOMParams): Promise<BOMResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('calculate-bom', {
        body: params,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data as BOMResult;
    },
  });
}
