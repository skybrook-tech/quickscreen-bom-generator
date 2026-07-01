import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  BASE_CLIENT_CONFIGS,
  FALLBACK_CLIENT_CONFIG,
  mergeCalculatorConfig,
  type ClientCalculatorConfig,
} from "../lib/baseCalculatorConfigs";

/**
 * Returns the merged ClientCalculatorConfig for a given product code.
 *
 * Resolution order:
 * 1. Base config from BASE_CLIENT_CONFIGS[productCode]
 * 2. DB override from supplier_product_calculator_configs (is_current=true, active=true)
 *
 * Falls back to FALLBACK_CLIENT_CONFIG if productCode is unknown.
 * Falls back to base config if DB query fails or returns no row.
 *
 * Cached by TanStack Query with key ['calculator-config', productCode].
 */
export function useCalculatorConfig(productCode: string): ClientCalculatorConfig {
  const base = BASE_CLIENT_CONFIGS[productCode] ?? FALLBACK_CLIENT_CONFIG;

  const query = useQuery({
    queryKey: ["calculator-config", productCode],
    enabled: isSupabaseConfigured && !!productCode,
    staleTime: 5 * 60 * 1000, // 5 min — config changes rarely
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_product_calculator_configs")
        .select("config")
        .eq("product_code", productCode)
        .eq("is_current", true)
        .eq("active", true)
        .maybeSingle();

      if (error || !data?.config) return null;
      return data.config as Partial<ClientCalculatorConfig>;
    },
  });

  if (!query.data) return base;
  return mergeCalculatorConfig(base, query.data);
}
