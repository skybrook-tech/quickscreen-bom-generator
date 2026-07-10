import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { localProducts, localFenceProducts } from '../lib/localSeedData';

export interface Product {
  id: string;
  name: string;
  system_type: string;
  product_type?: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  metadata?: {
    allowedAngles?: number[];
    /** Tier A: drives pitch ladder vs freeform height input — see `parseTargetHeightUi` */
    target_height_ui?: {
      mode?: 'pitch_ladder' | 'freeform_mm';
      pitch_var_keys?: string[];
    };
    options?: {
      slatSize?: string[];
      slatGap?: string[];
      colour?: string[];
    };
  };
}

// The Glass Outlet build-time fixtures (localSeedData) are ONLY a valid
// fallback when no backend is configured (offline dev). With a live backend,
// falling back to them on error/empty would show Glass Outlet's catalogue to
// OTHER tenant orgs (the products table is RLS-scoped per org) — fail loudly
// with an error/empty state instead of silently showing the wrong tenant.
const OFFLINE_FENCE_PRODUCTS = isSupabaseConfigured ? [] : localFenceProducts;

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return localProducts;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, system_type, product_type, description, image_url, active, sort_order, metadata')
        .order('active', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      // Empty is truthful (e.g. an org before its catalogue is seeded) — never
      // substitute another org's fixtures.
      return (data ?? []) as Product[];
    },
  });
}

/** Convenience hook: only fence-type products (excludes gates, other). */
export function useFenceProducts() {
  const query = useProducts();
  return {
    ...query,
    data: query.data
      ? query.data.filter(
          (p) => p.product_type === 'fence' || (!p.product_type && localFenceProducts.some((lp) => lp.system_type === p.system_type)),
        )
      : OFFLINE_FENCE_PRODUCTS,
  };
}
