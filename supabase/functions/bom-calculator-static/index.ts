// bom-calculator-static — static-rules BOM engine
// Loads component metadata and pricing from the DB (same tables as bom-calculator),
// then runs the static calculation logic from engine.ts.
//
// Pipeline:
//   1. CORS + JWT → resolveUserProfile → { orgId, pricingTier }
//   2. Parallel: fetch product_components + pricing_rules_with_sku for the org
//   3. initEngineData(dbComponents, dbPricing) — merges with synthetic fallbacks
//   4. calculateLocalBom(payload, tier) → BOM lines + run results
//   5. suggestAccessories(payload, lines, tier) → suggested accessory items
//   6. computeGateHardwareHints(payload) → per-gate weight estimates + ranked hardware
//   7. Return combined response

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { extractJwt, resolveEmbedOrg, resolveUserProfile } from "../_shared/auth.ts";
import type { PricingTier, SeedComponent, LocalPricingRule } from "./engine.ts";
import {
  calculateLocalBom,
  computeGateHardwareHints,
  initEngineData,
  suggestAccessories,
} from "./engine.ts";

async function loadDbComponents(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
): Promise<SeedComponent[]> {
  const { data, error } = await supabaseAdmin
    .from("product_components")
    .select("sku, name, description, category, unit, default_price, system_types, active")
    .eq("org_id", orgId)
    .eq("active", true);
  if (error) throw new Error(`Components lookup failed: ${error.message}`);
  return (data ?? []) as SeedComponent[];
}

async function loadDbPricing(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
): Promise<LocalPricingRule[]> {
  // Load all tiers — priceForSku falls back to tier1 when the requested tier has no rule
  const { data, error } = await supabaseAdmin
    .from("pricing_rules_with_sku")
    .select("sku, price, rule, priority, tier_code")
    .eq("org_id", orgId)
    .eq("active", true)
    .order("priority", { ascending: false });
  if (error) throw new Error(`Pricing lookup failed: ${error.message}`);
  return (data ?? []) as LocalPricingRule[];
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();
    const payload = body?.payload;
    const embedOrgSlug = body?.embedOrgSlug;

    // Two auth modes:
    //   • Authenticated app — resolve org + pricing tier from the JWT's profile.
    //   • Anonymous embed — resolve org from the slug, gated on embed_enabled,
    //     and force retail (tier1) pricing. Never expose trade tiers anonymously.
    const { orgId, pricingTier } =
      typeof embedOrgSlug === "string" && embedOrgSlug.length > 0
        ? await resolveEmbedOrg(embedOrgSlug)
        : await resolveUserProfile(extractJwt(req));
    const tier = pricingTier as PricingTier;

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [dbComponents, dbPricing] = await Promise.all([
      loadDbComponents(supabaseAdmin, orgId),
      loadDbPricing(supabaseAdmin, orgId),
    ]);

    initEngineData(dbComponents, dbPricing);

    const bomResult = calculateLocalBom(payload, tier);
    const suggestedItems = suggestAccessories(payload, bomResult.lines ?? [], tier);
    const gateHardwareHints = computeGateHardwareHints(payload);

    const response = {
      ...bomResult,
      suggestedItems,
      gateHardwareHints,
      pricingTier: tier,
      generatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status =
      message.includes("Authorization") || message.includes("JWT")
        ? 401
        : message.includes("Embedding is not enabled")
          ? 403
          : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
