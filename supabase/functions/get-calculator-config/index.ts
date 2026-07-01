// get-calculator-config — serves a UI-safe projection of CalculatorConfig.
//
// The v3 client no longer maintains a hand-copied duplicate of
// bom-calculator-static/config/base.ts. Instead it fetches the merged
// (base + supplier override) config here, stripped of internal SKUs,
// geometry constants, pack sizes, and stock lengths (see config/project.ts).
//
// Pipeline: CORS → JWT → resolveUserProfile → loadCalculatorConfigs(admin,
// orgId, productCodes) → projectUiConfig() per code → return map.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { extractJwt, resolveUserProfile } from "../_shared/auth.ts";
import { loadCalculatorConfigs } from "../bom-calculator-static/config/merge.ts";
import { BASE_CONFIGS } from "../bom-calculator-static/config/base.ts";
import { projectUiConfig } from "../bom-calculator-static/config/project.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const jwt = extractJwt(req);
    const { orgId } = await resolveUserProfile(jwt);

    let productCode: string | null = null;
    const url = new URL(req.url);
    productCode = url.searchParams.get("productCode");
    if (!productCode && req.method === "POST") {
      try {
        const body = await req.json();
        productCode = typeof body?.productCode === "string" ? body.productCode : null;
      } catch {
        // no body — fall through to "all products"
      }
    }

    const productCodes = productCode ? [productCode] : Object.keys(BASE_CONFIGS);
    const unknown = productCodes.filter((code) => !BASE_CONFIGS[code]);
    if (unknown.length > 0) {
      return jsonResponse({ error: `Unknown productCode: ${unknown.join(", ")}` }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const configs = await loadCalculatorConfigs(supabaseAdmin, orgId, productCodes);

    if (productCode) {
      const merged = configs.get(productCode);
      if (!merged) return jsonResponse({ error: `Unknown productCode: ${productCode}` }, 400);
      return jsonResponse(projectUiConfig(merged));
    }

    const result: Record<string, ReturnType<typeof projectUiConfig>> = {};
    for (const [code, merged] of configs) {
      result[code] = projectUiConfig(merged);
    }
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Authorization") || message.includes("JWT") ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});
