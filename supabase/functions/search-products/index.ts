import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { extractJwt, resolveUserProfile } from '../_shared/auth.ts';

/**
 * search-products
 *
 * Returns product component records matching a search query.
 * Used by the "Add Extra Item" autocomplete in the BOM UI.
 * Queries product_components (no RLS) via service role — never exposed to client.
 *
 * POST /functions/v1/search-products
 * Body: { query: string, limit?: number }
 * Returns: { items: Array<{ sku, name, description, category, unit }> }
 */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const jwt = extractJwt(req);
    const { orgId } = await resolveUserProfile(jwt);

    const body = await req.json();
    const query: string = (body.query ?? '').trim();
    const limit: number = Math.min(Number(body.limit ?? 10), 20);

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const pattern = `%${query}%`;

    const { data, error } = await supabaseAdmin
      .from('product_components')
      .select('sku, name, description, category, unit, default_price')
      .eq('org_id', orgId)
      .eq('active', true)
      .or(`sku.ilike.${pattern},name.ilike.${pattern},description.ilike.${pattern}`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Product search failed: ${error.message}`);

    return new Response(
      JSON.stringify({ items: data ?? [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
