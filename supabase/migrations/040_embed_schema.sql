-- ============================================================================
-- 040_embed_schema.sql  (brief 032 — embeddable configurator, schema layer)
--
-- Schema groundwork for the customer-facing embed (/embed/:orgSlug rendering the
-- v4 calculator anonymously). The anon ACCESS POLICIES — the security "sharp
-- edge" — live in the next migration (041_embed_rls.sql) so they can be reviewed
-- on their own. This migration only adds columns.
--
--   * organisations.embed_enabled — opt-in flag; nothing is anon-readable for an
--     org until this is true. Default false (every existing org stays private).
--   * organisations.embed_domains — advisory referrer allowlist for the loader.
--   * quotes.source — 'app' (authenticated) vs 'embed' (anonymous lead capture).
--   * quotes.user_id — made NULLABLE: an embed quote has no authenticated user.
--     Authenticated app quotes still set it; the existing own-quote RLS policies
--     (migration 003) are unaffected (NULL never equals auth.uid()).
--
-- organisations.slug already exists (migration 001); the embed resolves the org
-- by slug. Customer contact (name/email/phone) reuses the existing quotes.contact
-- JSONB — no new customer columns needed.
-- ============================================================================

-- ─── organisations: embed opt-in + referrer allowlist ──────────────────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS embed_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS embed_domains TEXT[];

-- ─── quotes: source + nullable user_id for anonymous embed leads ────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'embed'));

ALTER TABLE quotes ALTER COLUMN user_id DROP NOT NULL;

-- An embed quote must have no user and carry source='embed'; an app quote must
-- have a user. Enforces the two shapes so an anon insert can't masquerade as an
-- app quote (the anon INSERT policy in 041 also pins source='embed').
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS chk_quotes_source_user;
ALTER TABLE quotes ADD CONSTRAINT chk_quotes_source_user CHECK (
  (source = 'embed' AND user_id IS NULL)
  OR (source = 'app' AND user_id IS NOT NULL)
);
