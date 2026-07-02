import { useQuery, keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type {
  CanonicalVariables,
  UiCalculatorConfig,
} from "../types/calculatorConfig.types";
import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

function normaliseField(raw: Partial<SchemaField> & { field_key: string }): SchemaField {
  return {
    id: raw.id ?? raw.field_key,
    field_key: raw.field_key,
    label: raw.label ?? raw.field_key,
    control_type: raw.control_type ?? "text",
    data_type: raw.data_type ?? "string",
    unit: raw.unit,
    required: raw.required ?? false,
    default_value_json: raw.default_value_json,
    options_json: Array.isArray(raw.options_json) ? raw.options_json : [],
    visible_when_json: raw.visible_when_json ?? {},
    sort_order: raw.sort_order ?? 0,
    options_group: raw.options_group,
  };
}

function normaliseConfig(raw: UiCalculatorConfig): UiCalculatorConfig {
  return {
    ...raw,
    formFields: {
      job: (raw.formFields?.job ?? []).map(normaliseField),
      run: (raw.formFields?.run ?? []).map(normaliseField),
      segment: (raw.formFields?.segment ?? []).map(normaliseField),
    },
  };
}

/**
 * Stable, sorted-key serialisation of the variables object so identical
 * variable sets hit the same cache key regardless of key order. Only
 * option-affecting primitives are stringified; nested objects are skipped.
 */
function stableVariablesKey(variables?: CanonicalVariables): string {
  if (!variables) return "default";
  const keys = Object.keys(variables).sort();
  if (keys.length === 0) return "default";
  return keys
    .map((k) => {
      const v = variables[k];
      return typeof v === "object" ? `${k}:~` : `${k}:${String(v)}`;
    })
    .join("|");
}

/**
 * Fetches the merged (base + supplier override), variables-resolved, UI-safe
 * projection of CalculatorConfig for a product via the `get-calculator-config`
 * edge function. Single source of truth for form field definitions, option
 * lists, the height ladder, and capability flags in the v3 calculator.
 *
 * The query key includes a stable serialisation of `variables`, so a variable
 * change that affects resolved options (finish family, slat size, slat gap,
 * colour) triggers a refetch and returns a freshly resolved config.
 * `keepPreviousData` keeps the previous resolved options rendered during the
 * refetch so forms don't flash empty.
 *
 * Returns `undefined` while loading or on error — the caller is responsible
 * for gating the UI (e.g. RunCardInner's loading skeleton). There is no
 * offline fallback; the edge function is the source of truth.
 */
export function useCalculatorConfig(
  productCode: string,
  variables?: CanonicalVariables,
): UiCalculatorConfig | undefined {
  return useCalculatorConfigQuery(productCode, variables).data;
}

/**
 * Same fetch as `useCalculatorConfig` but returns the full TanStack Query
 * result, so callers that need loading/fetching state (e.g. useRunReconciliation's
 * freshness guard) can inspect it.
 */
export function useCalculatorConfigQuery(
  productCode: string,
  variables?: CanonicalVariables,
): UseQueryResult<UiCalculatorConfig, Error> {
  return useQuery({
    queryKey: ["calculator-config", productCode, stableVariablesKey(variables)],
    enabled: isSupabaseConfigured && !!productCode,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<UiCalculatorConfig> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(`No authenticated session for calculator config (${productCode}).`);
      }

      const { data, error } = await supabase.functions.invoke<UiCalculatorConfig>(
        "get-calculator-config",
        {
          body: variables && Object.keys(variables).length > 0
            ? { productCode, variables }
            : { productCode },
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (error || !data || typeof data !== "object") {
        throw new Error(
          `get-calculator-config failed for ${productCode}: ${
            error?.message ?? "no data"
          }`,
        );
      }
      return normaliseConfig(data);
    },
  });
}
