import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { extractJwt, resolveUserProfile } from '../_shared/auth.ts';
import { create, all } from 'https://esm.sh/mathjs@13/number';
import type { BOMLineItem, PricingRule, PricingTier } from '../_shared/types.ts';

const mathjs = create(all);

/**
 * Resolves the unit price for a SKU given its rules (sorted highest priority first)
 * and the quantity being priced. Evaluates each rule expression using math.js.
 * The first rule whose expression evaluates to true (or has no expression) wins.
 */
function resolvePrice(rules: PricingRule[], qty: number): number {
  for (const r of rules) {
    if (!r.rule) return r.price;  // no expression = always applies
    try {
      if (mathjs.evaluate(r.rule, { qty }) === true) return r.price;
    } catch {
      // malformed rule expression — skip and try next
    }
  }
  return 0;
}

/**
 * calculate-pricing
 *
 * Re-prices an existing BOM result for a different tier without recalculating
 * quantities. Allows the pricing tier selector to update instantly on the client
 * after the initial BOM calculation.
 *
 * POST /functions/v1/calculate-pricing
 * Body: { bomItems: BOMLineItem[], pricingTier: 'tier1' | 'tier2' | 'tier3' }
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const jwt = extractJwt(req);
    const { orgId } = await resolveUserProfile(jwt);

    const body = await req.json();
    const bomItems: BOMLineItem[] = body.bomItems;
    const tier: PricingTier      = body.pricingTier ?? 'tier1';

    // Load pricing for this org (service role — never exposed to client)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const skus = [...new Set(bomItems.map((i) => i.sku))];

    const { data, error } = await supabaseAdmin
      .from('pricing_rules_with_sku')
      .select('sku, price, rule, priority')
      .eq('org_id', orgId)
      .eq('tier_code', tier)
      .eq('active', true)
      .in('sku', skus)
      .order('priority', { ascending: false });

    if (error) throw new Error(`Pricing lookup failed: ${error.message}`);

    // Group rules by sku (sorted highest priority first)
    const pricingMap = new Map<string, PricingRule[]>();
    for (const row of data ?? []) {
      const existing = pricingMap.get(row.sku) ?? [];
      existing.push(row as PricingRule);
      pricingMap.set(row.sku, existing);
    }

    const priced = bomItems.map((i) => {
      const rules = pricingMap.get(i.sku) ?? [];
      const unitPrice = resolvePrice(rules, i.quantity);
      return {
        ...i,
        unitPrice,
        lineTotal: parseFloat((i.quantity * unitPrice).toFixed(2)),
      };
    });

    const total      = parseFloat(priced.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
    const gst        = parseFloat((total * 0.1).toFixed(2));
    const grandTotal = parseFloat((total + gst).toFixed(2));

    return new Response(
      JSON.stringify({ items: priced, total, gst, grandTotal, pricingTier: tier }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }
});
