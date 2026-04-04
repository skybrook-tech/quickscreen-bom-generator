import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Extract the JWT from the Authorization header.
 * Throws if the header is missing or malformed.
 */
export function extractJwt(req: Request): string {
  const auth = req.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  return auth.replace('Bearer ', '');
}

/**
 * Resolve the calling user's org_id and pricing_tier from their profile.
 * Uses the service-role client so RLS doesn't block the profile lookup.
 */
export async function resolveUserProfile(jwt: string): Promise<{
  userId: string;
  orgId: string;
  pricingTier: 'tier1' | 'tier2' | 'tier3';
}> {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !user) {
    throw new Error('Invalid JWT — could not resolve user');
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('org_id, pricing_tier')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  return {
    userId: user.id,
    orgId: profile.org_id,
    pricingTier: (profile.pricing_tier ?? 'tier1') as 'tier1' | 'tier2' | 'tier3',
  };
}
