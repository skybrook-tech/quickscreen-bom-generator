import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Marker message thrown when an anon embed caller exceeds its window. The edge
 * functions map this to HTTP 429 in their catch blocks.
 */
export const RATE_LIMIT_MESSAGE =
  "Rate limit exceeded — please wait a moment and try again";

/**
 * Best-effort per-caller key from the request. Supabase/Netlify put the real
 * client IP first in x-forwarded-for. Not spoof-proof (nothing IP-based is), but
 * enough to blunt casual scripted abuse of the anon embed endpoints.
 */
function clientKeyFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0].trim();
  return ip || "unknown";
}

/**
 * Enforce a per-(org, client) sliding-window rate limit for an anonymous embed
 * request. Throws RATE_LIMIT_MESSAGE when over the limit.
 *
 * Fails OPEN: if the limiter query itself errors (e.g. a transient DB blip) we
 * log and allow the request. For a deal-critical embed, a brief limiter outage
 * should not take the calculator down — the abuse window is small and the
 * `embed_enabled` gate still applies.
 */
export async function enforceEmbedRateLimit(
  orgId: string,
  req: Request,
  opts: { limit: number; windowSeconds: number },
): Promise<void> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: allowed, error } = await supabaseAdmin.rpc(
    "embed_rate_limit_hit",
    {
      p_org_id: orgId,
      p_client_key: clientKeyFromRequest(req),
      p_limit: opts.limit,
      p_window_seconds: opts.windowSeconds,
    },
  );

  if (error) {
    console.error("[embed rate limit] check failed (allowing):", error.message);
    return; // fail open
  }

  if (allowed === false) {
    throw new Error(RATE_LIMIT_MESSAGE);
  }
}
