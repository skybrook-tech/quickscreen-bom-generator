import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SchemaField } from '../components/calculator-v3/SchemaDrivenForm';

type Scope = 'job' | 'run' | 'segment';

// Fetches product_variables rows for the given product + scope and shapes
// them into SchemaField[] that the v3 SchemaDrivenForm can render directly.
// RLS on product_variables allows authenticated SELECT (migration 012).
export function useProductVariables(systemType: string | null, scope: Scope) {
  return useQuery<SchemaField[]>({
    queryKey: ['product-variables', systemType, scope],
    enabled: !!systemType,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!systemType) return [];
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('id')
        .eq('system_type', systemType)
        .maybeSingle();
      if (prodErr) throw prodErr;
      if (!product) return [];

      const { data, error } = await supabase
        .from('product_variables')
        .select('id, name, label, data_type, unit, required, default_value_json, options_json, sort_order')
        .eq('product_id', product.id)
        .eq('scope', scope)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((v) => ({
        id: v.id as string,
        field_key: v.name as string,
        label: v.label as string,
        // Pick a sensible control_type. Enums render as <select>, numbers as number input,
        // booleans as toggle, everything else as text.
        control_type:
          v.data_type === 'enum'
            ? 'select'
            : v.data_type === 'number' || v.data_type === 'integer'
              ? 'number'
              : v.data_type === 'boolean'
                ? 'toggle'
                : 'text',
        data_type: v.data_type as string,
        unit: (v.unit as string | null) ?? undefined,
        required: Boolean(v.required),
        default_value_json: v.default_value_json,
        options_json: Array.isArray(v.options_json) ? (v.options_json as unknown[]) : [],
        visible_when_json: {},
        sort_order: Number(v.sort_order ?? 0),
      }));
    },
  });
}
