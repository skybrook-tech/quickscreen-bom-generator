import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { searchLocalProducts } from '../lib/localSeedData';
import { useEmbed } from '../context/EmbedContext';

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
  // The catalog typeahead hits product_components (SKUs + cost pricing) via a
  // service-role edge function — staff/trade only. On the anon embed route there
  // is no such access, and we must never surface SKU/pricing data there, so the
  // typeahead returns nothing (the create-custom-line flow still works).
  const { orgId: embedOrgId } = useEmbed();
  const enabled = trimmed.length >= 2 && !embedOrgId;

  return useQuery<ProductSearchItem[]>({
    queryKey: ['product-search', trimmed, embedOrgId],
    queryFn: async () => {
      if (!isSupabaseConfigured) return searchLocalProducts(trimmed, 10);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return searchLocalProducts(trimmed, 10);

      const response = await supabase.functions.invoke('search-products', {
        body: { query: trimmed, limit: 10 },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) return searchLocalProducts(trimmed, 10);
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
