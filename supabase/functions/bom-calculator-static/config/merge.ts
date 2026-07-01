// config/merge.ts — deep-merge utilities and DB config loader.
//
// loadCalculatorConfigs: fetches supplier override rows from
// supplier_product_calculator_configs (added in migration 024) and
// deep-merges each over the matching base config. Missing override → base only.

import type { CalculatorConfig } from "./types.ts";
import { BASE_CONFIGS } from "./base.ts";

// Recursive deep merge: override wins for scalar values; objects are merged
// recursively; arrays in the override REPLACE (not append) base arrays.
export function deepMerge<T>(base: T, override: Partial<T>): T {
  if (override === null || override === undefined) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    return (override as T) ?? base;
  }
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = override[key];
    const bv = base[key];
    if (ov === undefined) continue;
    if (Array.isArray(ov) || typeof ov !== "object" || ov === null) {
      result[key] = ov as T[keyof T];
    } else {
      result[key] = deepMerge(bv, ov as Partial<T[keyof T]>);
    }
  }
  return result;
}

// DB row shape from supplier_product_calculator_configs
type ConfigRow = {
  product_code: string;
  config: Partial<CalculatorConfig>;
};

// Builds a Map<productCode, CalculatorConfig> for the given product codes.
// Uses the base config as the default; if a DB override row exists for the org
// it is deep-merged on top.
//
// admin: SupabaseClient (service role). productCodes defaults to all base config codes.
export async function loadCalculatorConfigs(
  // deno-lint-ignore no-explicit-any
  admin: any,
  orgId: string,
  productCodes?: string[],
): Promise<Map<string, CalculatorConfig>> {
  const codes = productCodes ?? Object.keys(BASE_CONFIGS);
  const result = new Map<string, CalculatorConfig>();

  for (const code of codes) {
    const base = BASE_CONFIGS[code];
    if (base) result.set(code, base);
  }

  // Gracefully skip if the table doesn't exist yet (pre-migration environments).
  try {
    const { data: rows } = await admin
      .from("supplier_product_calculator_configs")
      .select("product_code, config")
      .eq("org_id", orgId)
      .eq("is_current", true)
      .eq("active", true)
      .in("product_code", codes);

    if (rows) {
      for (const row of rows as ConfigRow[]) {
        const base = result.get(row.product_code);
        if (!base) continue;
        result.set(row.product_code, deepMerge(base, row.config));
      }
    }
  } catch {
    // Table doesn't exist yet — use base configs only.
  }

  return result;
}
