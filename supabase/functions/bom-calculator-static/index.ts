// bom-calculator-static — static-rules BOM engine (fallback when DB rules unavailable)
// Accepts a CanonicalPayload and returns a priced BOM using bundled seed JSON data.
// No DB table queries — all calculation logic and pricing live in engine.ts.
//
// Pipeline:
//   1. CORS + JWT → resolveUserProfile → { orgId, pricingTier }
//   2. Parse { payload, pricingTier } from request body; use server-resolved tier (ignore client tier)
//   3. calculateLocalBom(payload, tier) → BOM lines + run results
//   4. suggestAccessories(payload, lines, tier) → suggested accessory items
//   5. computeGateHardwareHints(payload) → per-gate weight estimates + ranked hardware
//   6. Return combined response

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { extractJwt, resolveUserProfile } from "../_shared/auth.ts";
import {
  calculateLocalBom,
  computeGateHardwareHints,
  suggestAccessories,
} from "./engine.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const jwt = extractJwt(req);
    const { pricingTier } = await resolveUserProfile(jwt);

    const body = await req.json();
    const payload = body?.payload;

    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use server-resolved pricing tier — never trust client-sent tier
    const tier = pricingTier;

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
    const status = message.includes("Authorization") || message.includes("JWT") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
