import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AdminComponent {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  default_price: number | null;
  system_types: string[];
  metadata: Record<string, unknown> | null;
  active: boolean;
  updated_at: string;
  pricing_rules: { count: number }[];
}

export interface ComponentWithPricing extends Omit<AdminComponent, 'pricing_rules'> {
  pricingCount: number;
  sharedByCount: number;
  hasPricing: boolean;
}

function normalise(raw: AdminComponent): ComponentWithPricing {
  const { pricing_rules, ...rest } = raw;
  const pricingCount = pricing_rules?.[0]?.count ?? 0;
  return {
    ...rest,
    pricingCount,
    sharedByCount: rest.system_types?.length ?? 0,
    hasPricing: pricingCount > 0,
  };
}

/** All components (for the global /admin/components page). */
export function useProductComponents() {
  return useQuery<ComponentWithPricing[]>({
    queryKey: ['admin-all-components'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_components')
        .select('*, pricing_rules(count)')
        .order('category')
        .order('sku');
      if (error) throw error;
      return ((data ?? []) as AdminComponent[]).map(normalise);
    },
  });
}

/** Components for a specific product (by system_type). */
export function useProductComponentsBySystemType(systemType: string | null) {
  return useQuery<ComponentWithPricing[]>({
    queryKey: ['admin-components-by-system-type', systemType],
    enabled: !!systemType,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_components')
        .select('*, pricing_rules(count)')
        .contains('system_types', [systemType!])
        .order('category')
        .order('sku');
      if (error) throw error;
      return ((data ?? []) as AdminComponent[]).map(normalise);
    },
  });
}
