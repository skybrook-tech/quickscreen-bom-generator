import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─── Raw row types ────────────────────────────────────────────────────────────

export type RuleSet = {
  id: string; org_id: string; product_id: string; name: string;
  description: string | null; active: boolean; created_at: string; updated_at: string;
  rule_versions: RuleVersion[];
};

export type RuleVersion = {
  id: string; org_id: string; rule_set_id: string; version_label: string;
  is_current: boolean; effective_from: string | null; notes: string | null;
  created_at: string; updated_at: string;
};

export type ProductRule = {
  id: string; org_id: string; product_id: string; rule_set_id: string;
  version_id: string; stage: string; name: string; expression: string;
  output_key: string; priority: number; active: boolean; notes: string | null;
  created_at: string; updated_at: string;
};

export type ProductConstraint = {
  id: string; org_id: string; product_id: string; name: string;
  constraint_type: string; value_text: string; unit: string | null;
  severity: string; applies_when_json: Record<string, unknown>;
  message: string; active: boolean; created_at: string; updated_at: string;
};

export type ProductVariable = {
  id: string; org_id: string; product_id: string; name: string; label: string;
  data_type: string; unit: string | null; required: boolean;
  default_value_json: unknown; options_json: unknown[]; options_group: string | null;
  scope: string; sort_order: number; active: boolean;
  created_at: string; updated_at: string;
};

export type ProductValidation = {
  id: string; org_id: string; product_id: string; name: string;
  expression: string; severity: string; message: string;
  active: boolean; created_at: string; updated_at: string;
};

export type ProductSelector = {
  id: string; org_id: string; product_id: string; selector_key: string;
  component_category: string; selector_type: string;
  match_json: Record<string, unknown>; sku_pattern: string; qty_key: string | null;
  priority: number; notes: string | null; active: boolean;
  created_at: string; updated_at: string;
};

export type ProductCompanion = {
  id: string; org_id: string; product_id: string; rule_key: string;
  trigger_category: string; trigger_match_json: Record<string, unknown>;
  add_category: string; add_sku_pattern: string; qty_formula: string;
  is_pack: boolean; priority: number; notes: string | null;
  active: boolean; created_at: string; updated_at: string;
};

export type ProductWarning = {
  id: string; org_id: string; product_id: string; warning_key: string;
  severity: string; condition_json: Record<string, unknown>; message: string;
  active: boolean; created_at: string; updated_at: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ProductEngineData {
  ruleSets: { data: RuleSet[] | undefined; isLoading: boolean; error: Error | null };
  rules: { data: ProductRule[] | undefined; isLoading: boolean; error: Error | null };
  constraints: { data: ProductConstraint[] | undefined; isLoading: boolean; error: Error | null };
  variables: { data: ProductVariable[] | undefined; isLoading: boolean; error: Error | null };
  validations: { data: ProductValidation[] | undefined; isLoading: boolean; error: Error | null };
  selectors: { data: ProductSelector[] | undefined; isLoading: boolean; error: Error | null };
  companions: { data: ProductCompanion[] | undefined; isLoading: boolean; error: Error | null };
  warnings: { data: ProductWarning[] | undefined; isLoading: boolean; error: Error | null };
}

export function useProductEngineData(productId: string | null): ProductEngineData {
  const ruleSets = useQuery<RuleSet[]>({
    queryKey: ['admin-rule_sets', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rule_sets')
        .select('*, rule_versions(*)')
        .eq('product_id', productId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as RuleSet[];
    },
  });

  const rules = useQuery<ProductRule[]>({
    queryKey: ['admin-product_rules', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_rules')
        .select('*')
        .eq('product_id', productId!)
        .order('stage')
        .order('priority');
      if (error) throw error;
      return (data ?? []) as ProductRule[];
    },
  });

  const constraints = useQuery<ProductConstraint[]>({
    queryKey: ['admin-product_constraints', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_constraints')
        .select('*')
        .eq('product_id', productId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ProductConstraint[];
    },
  });

  const variables = useQuery<ProductVariable[]>({
    queryKey: ['admin-product_variables', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variables')
        .select('*')
        .eq('product_id', productId!)
        .order('scope')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ProductVariable[];
    },
  });

  const validations = useQuery<ProductValidation[]>({
    queryKey: ['admin-product_validations', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_validations')
        .select('*')
        .eq('product_id', productId!)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ProductValidation[];
    },
  });

  const selectors = useQuery<ProductSelector[]>({
    queryKey: ['admin-product_component_selectors', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_component_selectors')
        .select('*')
        .eq('product_id', productId!)
        .order('component_category')
        .order('priority');
      if (error) throw error;
      return (data ?? []) as ProductSelector[];
    },
  });

  const companions = useQuery<ProductCompanion[]>({
    queryKey: ['admin-product_companion_rules', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_companion_rules')
        .select('*')
        .eq('product_id', productId!)
        .order('priority');
      if (error) throw error;
      return (data ?? []) as ProductCompanion[];
    },
  });

  const warnings = useQuery<ProductWarning[]>({
    queryKey: ['admin-product_warnings', productId],
    enabled: !!productId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_warnings')
        .select('*')
        .eq('product_id', productId!)
        .order('severity')
        .order('warning_key');
      if (error) throw error;
      return (data ?? []) as ProductWarning[];
    },
  });

  return { ruleSets, rules, constraints, variables, validations, selectors, companions, warnings };
}
