import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { localProducts } from '../lib/localSeedData';

export interface Product {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  metadata?: {
    allowedAngles?: number[];
    options?: {
      slatSize?: string[];
      slatGap?: string[];
      colour?: string[];
    };
  };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return localProducts;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, system_type, description, image_url, active, sort_order, metadata')
        .order('active', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) return localProducts;
      return data && data.length > 0 ? (data as Product[]) : localProducts;
    },
  });
}
