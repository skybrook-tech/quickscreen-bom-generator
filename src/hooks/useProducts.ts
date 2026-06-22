import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { localProducts } from '../lib/localSeedData';
import { useEmbed } from '../context/EmbedContext';
import { getCustomCalculators } from '../lib/customCalculators';

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

export function useProducts() {
  // On the anon embed route, RLS exposes every embed-enabled org's products;
  // scope to this embed's org so the picker shows only that supplier's range.
  const { orgId } = useEmbed();
  return useQuery({
    queryKey: ['products', orgId],
    queryFn: async () => {
      let dbProducts: Product[] = [];
      if (!isSupabaseConfigured) {
        dbProducts = localProducts;
      } else {
        let query = supabase
          .from('products')
          .select('id, name, system_type, description, image_url, active, sort_order, metadata')
          .order('active', { ascending: false })
          .order('sort_order', { ascending: true });
        if (orgId) query = query.eq('org_id', orgId);

        const { data, error } = await query;
        if (error) {
          dbProducts = localProducts;
        } else {
          dbProducts = data && data.length > 0 ? (data as Product[]) : localProducts;
        }
      }

      // Append custom calculators as products
      const customCalcs = getCustomCalculators();
      const customProducts: Product[] = customCalcs.map((c) => {
        // Determine height mode based on variables
        const hasFreeformHeight = c.variables.some(
          (v) =>
            v.control_type === 'number' &&
            (v.field_key.toLowerCase().includes('height') || v.label.toLowerCase().includes('height'))
        );
        return {
          id: c.id,
          name: c.name,
          system_type: c.id,
          description: c.description,
          image_url: null,
          active: true,
          sort_order: 100,
          metadata: {
            allowedAngles: [90, 135, 180],
            target_height_ui: {
              mode: hasFreeformHeight ? 'freeform_mm' : 'pitch_ladder',
            },
          },
        };
      });

      return [...dbProducts, ...customProducts];
    },
  });
}
