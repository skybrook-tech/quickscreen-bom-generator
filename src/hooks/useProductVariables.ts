import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getLocalVariables } from '../lib/localSeedData';
import { initialVariablesForSystem } from '../lib/productOptionRules';
import type { SchemaField } from '../components/calculator-v3/SchemaDrivenForm';

/** Builds a variables object from product_variables.default_value_json. */
export function defaultVariablesFromFields(
  fields: SchemaField[],
): Record<string, unknown> {
  return Object.fromEntries(
    fields
      .filter((f) => f.default_value_json !== undefined)
      .map((f) => [f.field_key, f.default_value_json]),
  );
}

/**
 * Returns DB-driven default variables for a product, falling back to
 * `initialVariablesForSystem()` if fields are not yet loaded or Supabase is
 * not configured. Scope defaults to "run".
 */
export function useDefaultVariables(
  productCode: string,
  scope: 'job' | 'run' | 'segment' = 'run',
): Record<string, unknown> {
  const query = useProductVariables(productCode, scope);
  if (!query.data || query.data.length === 0) {
    return initialVariablesForSystem(productCode) as Record<string, unknown>;
  }
  const fromDb = defaultVariablesFromFields(query.data);
  if (Object.keys(fromDb).length === 0) {
    return initialVariablesForSystem(productCode) as Record<string, unknown>;
  }
  return fromDb;
}

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
      if (!isSupabaseConfigured) return getLocalVariables(systemType, scope);

      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('id')
        .eq('system_type', systemType)
        .maybeSingle();
      if (prodErr) return getLocalVariables(systemType, scope);
      if (!product) return getLocalVariables(systemType, scope);

      const { data, error } = await supabase
        .from('product_variables')
        .select('id, name, label, data_type, unit, required, default_value_json, options_json, options_group, sort_order')
        .eq('product_id', product.id)
        .eq('scope', scope)
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (error) return getLocalVariables(systemType, scope);

      if (!data || data.length === 0) return getLocalVariables(systemType, scope);

      return data.map((v) => ({
        id: v.id as string,
        field_key: v.name as string,
        label: v.label as string,
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
        options_group: (v.options_group as string | null) ?? undefined,
        visible_when_json: {},
        sort_order: Number(v.sort_order ?? 0),
      }));
    },
  });
}
