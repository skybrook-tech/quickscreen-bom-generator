-- ============================================================================
-- 042_embed_rate_limits.sql  (brief 032 — abuse limits for the anon embed)
--
-- The anonymous embed endpoints (embed-quote write + the embedOrgSlug branch of
-- bom-calculator-static) are reachable by anyone who knows an embed-enabled org's
-- slug. `embed_enabled` authorises WHICH orgs are reachable, not HOW OFTEN. This
-- adds a per-(org, client) sliding-window counter so an anon caller can't spam an
-- org's quote history or hammer the BOM engine.
--
-- The counter is Postgres-backed (not in-memory) because edge functions are
-- stateless and run across many instances — an in-process counter wouldn't hold.
-- Only the service-role edge functions touch this; anon/authenticated get nothing
-- (RLS on, no policies, grants revoked).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.embed_rate_limits (
  org_id       uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  -- Opaque per-caller key (derived from the request IP in the edge function).
  client_key   text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, client_key)
);

ALTER TABLE public.embed_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies → unreachable by anon/authenticated. Service role bypasses RLS.
REVOKE ALL ON public.embed_rate_limits FROM anon, authenticated;

-- ─── Atomic hit-and-check ───────────────────────────────────────────────────
-- One statement (INSERT ... ON CONFLICT ... RETURNING) so concurrent calls can't
-- race the read-modify-write. Returns TRUE when the call is within the limit.
--   * If the stored window has expired, it resets (window_start=now, count=1).
--   * Otherwise it increments. Over-limit calls keep counting (and return FALSE)
--     until the window naturally expires.
CREATE OR REPLACE FUNCTION public.embed_rate_limit_hit(
  p_org_id         uuid,
  p_client_key     text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now   timestamptz := now();
  v_count integer;
BEGIN
  INSERT INTO public.embed_rate_limits AS r (org_id, client_key, window_start, count)
  VALUES (p_org_id, p_client_key, v_now, 1)
  ON CONFLICT (org_id, client_key) DO UPDATE
    SET window_start = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds)
            THEN v_now
          ELSE r.window_start
        END,
        count = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds)
            THEN 1
          ELSE r.count + 1
        END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.embed_rate_limit_hit(uuid, text, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.embed_rate_limit_hit(uuid, text, integer, integer) TO service_role;
