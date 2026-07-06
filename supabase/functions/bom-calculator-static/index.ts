// bom-calculator-static — static-rules BOM engine
// Loads component metadata and pricing from the DB (the only price source),
// then runs the static calculation logic from engine.ts.
//
// Pipeline:
//   1. CORS + JWT → resolveUserProfile → { orgId, pricingTier }
//   2. Parallel: fetch product_components + pricing_rules_with_sku + configs for the org
//   3. makeCalcContext({ dbComponents, dbPricingRules, configs })
//   4. calculateLocalBom(payload, tier, ctx) → BOM lines + run results
//   5. suggestAccessories(payload, lines, tier, ctx) → suggested accessory items
//   6. computeGateHardwareHints(payload) → per-gate weight estimates + ranked hardware
//   7. Return combined response

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { extractJwt, resolveUserProfile } from "../_shared/auth.ts";
import type { PricingTier } from "./engine.ts";
import {
  calculateLocalBom,
  computeGateHardwareHints,
  makeCalcContext,
  suggestAccessories,
} from "./engine.ts";
import { loadCalculatorConfigs } from "./config/merge.ts";
import { loadDbComponents, loadDbPricing } from "./db.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const jwt = extractJwt(req);
    const { orgId, pricingTier } = await resolveUserProfile(jwt);
    const tier = pricingTier as PricingTier;

    const body = await req.json();
    const payload = body?.payload;

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

    const [dbComponents, dbPricing, configs] = await Promise.all([
      loadDbComponents(supabaseAdmin, orgId),
      loadDbPricing(supabaseAdmin, orgId),
      loadCalculatorConfigs(supabaseAdmin, orgId),
    ]);

    const ctx = makeCalcContext({ dbComponents, dbPricingRules: dbPricing, configs });

    const bomResult = calculateLocalBom(payload, tier, ctx);
    const suggestedItems = suggestAccessories(payload, bomResult.lines ?? [], tier, ctx);
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
    const status = message.includes("Authorization") || message.includes("JWT") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
