import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AdminProduct {
  id: string;
  name: string;
  system_type: string;
  product_type: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  compatible_with_system_types: string[];
  metadata: Record<string, unknown> | null;
  rule_sets: { count: number }[];
  product_variables: { count: number }[];
  product_rules: { count: number }[];
  product_component_selectors: { count: number }[];
}

export function useAdminProducts() {
  return useQuery<AdminProduct[]>({
    queryKey: ['admin-products'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(
          `id, name, system_type, product_type, description, image_url, active, sort_order,
           compatible_with_system_types, metadata,
           rule_sets(count),
           product_variables(count),
           product_rules(count),
           product_component_selectors(count)`
        )
        .order('product_type', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminProduct[];
    },
  });
}
