import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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
      const { data, error } = await supabase
        .from('products')
        .select('id, name, system_type, description, image_url, active, sort_order, metadata')
        .order('active', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });
}
