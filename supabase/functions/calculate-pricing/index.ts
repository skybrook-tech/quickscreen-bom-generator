import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { extractJwt, resolveUserProfile } from '../_shared/auth.ts';
import type { BOMLineItem, PricingTier } from '../_shared/types.ts';

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
      .from('product_pricing')
      .select('sku, tier1_price, tier2_price, tier3_price')
      .eq('org_id', orgId)
      .eq('active', true)
      .in('sku', skus);

    if (error) throw new Error(`Pricing lookup failed: ${error.message}`);

    const pricingMap = new Map<string, Record<string, number>>();
    for (const row of data ?? []) {
      pricingMap.set(row.sku, row);
    }

    const priced = bomItems.map((i) => {
      const row = pricingMap.get(i.sku);
      const unitPrice = row ? (row[`${tier}_price`] as number) : 0;
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
