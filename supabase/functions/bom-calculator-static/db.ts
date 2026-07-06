// db.ts — DB catalogue loaders for the static BOM engine.
//
// PostgREST caps un-ranged selects at db.max_rows (default 1000), and the
// catalogue is larger than that (2k+ components, 15k+ pricing rules) — so all
// loaders MUST paginate or the engine silently prices from a truncated
// catalogue. Pages of 1000 until a short page.
//
// Shared by index.ts (the edge function) and integration_db_test.ts (which
// runs the same loaders + engine against a seeded local DB).

import type { SeedComponent, LocalPricingRule } from "./config/types.ts";

const DB_PAGE_SIZE = 1000;

export async function loadAllPages<T>(
  // deno-lint-ignore no-explicit-any
  buildQuery: (from: number, to: number) => any,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const from = page * DB_PAGE_SIZE;
    const { data, error } = await buildQuery(from, from + DB_PAGE_SIZE - 1);
    if (error) throw new Error(`${label} lookup failed: ${error.message}`);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < DB_PAGE_SIZE) return rows;
  }
}

export function loadDbComponents(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  orgId: string,
): Promise<SeedComponent[]> {
  return loadAllPages<SeedComponent>(
    (from, to) => supabaseAdmin
      .from("product_components")
      .select("sku, name, description, category, unit, default_price, system_types, active, internal_sku")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("sku", { ascending: true })
      .range(from, to),
    "Components",
  );
}

export function loadDbPricing(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  orgId: string,
): Promise<LocalPricingRule[]> {
  // Load all tiers — priceForSku falls back to tier1 when the requested tier has no rule
  return loadAllPages<LocalPricingRule>(
    (from, to) => supabaseAdmin
      .from("pricing_rules_with_sku")
      .select("sku, price, rule, priority, tier_code")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("priority", { ascending: false })
      .order("id", { ascending: true }) // unique tiebreaker → stable pagination
      .range(from, to),
    "Pricing",
  );
}
