import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { searchLocalProducts } from '../lib/localSeedData';

export interface ProductSearchItem {
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  unitPrice?: number;  // default_price from product_components (ex-GST)
}

/**
 * Search product_components by SKU, name, or description.
 * Minimum 2 characters required. Results come from the search-products edge function
 * (product_components has no RLS — must be accessed server-side).
 */
export function useProductSearch(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  return useQuery<ProductSearchItem[]>({
    queryKey: ['product-search', trimmed],
    queryFn: async () => {
      // The local-fixture search is Glass Outlet's catalogue — only valid as a
      // fallback when no backend is configured (offline dev). With a live
      // backend, no-session/error must fail empty/loud, never show another
      // tenant's components.
      if (!isSupabaseConfigured) return searchLocalProducts(trimmed, 10);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const response = await supabase.functions.invoke('search-products', {
        body: { query: trimmed, limit: 10 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      // Map default_price from the edge function response to unitPrice
      return ((response.data?.items ?? []) as Array<Record<string, unknown>>).map((item) => ({
        sku: item.sku as string,
        name: item.name as string,
        description: item.description as string,
        category: item.category as string,
        unit: item.unit as string,
        unitPrice: item.default_price != null ? Number(item.default_price) : undefined,
      })) satisfies ProductSearchItem[];
    },
    enabled,
    staleTime: 30_000, // cache results for 30s
  });
}
