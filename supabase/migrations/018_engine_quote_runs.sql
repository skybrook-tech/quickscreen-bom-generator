-- 018_engine_quote_runs.sql
--
-- v3 engine: quote_runs and quote_run_segments.
-- Persistent storage of the canonical payload for v3 quotes.
-- quote_runs:         one row per product run within a quote (FK → quotes.id).
-- quote_run_segments: one row per canvas segment within a run (FK → quote_runs.id).
--
-- runId and segmentId are stable across round-trips — canvas, form, engine, and
-- these tables all key on them. Do not regenerate in adapter code.
--
-- RLS mirrors the quotes table pattern:
--   SELECT: all org members can see all org rows (staff visibility)
--   INSERT/UPDATE/DELETE: org-scoped (same as quotes)

-- ─── quote_runs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quote_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_runs_quote_order
  ON quote_runs (quote_id, sort_order);

CREATE TRIGGER trg_quote_runs_updated_at
  BEFORE UPDATE ON quote_runs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE quote_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_org_quote_runs"
  ON quote_runs FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "users_insert_own_quote_runs"
  ON quote_runs FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "users_update_own_quote_runs"
  ON quote_runs FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "users_delete_own_quote_runs"
  ON quote_runs FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

-- ─── quote_run_segments ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quote_run_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  quote_run_id UUID NOT NULL REFERENCES quote_runs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  segment_type TEXT NOT NULL,
  segment_kind TEXT,
  length_mm NUMERIC,
  panel_width_mm NUMERIC,
  target_height_mm NUMERIC,
  bay_count INTEGER,
  turn_deg NUMERIC,
  left_termination TEXT,
  right_termination TEXT,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_run_segments_run_order
  ON quote_run_segments (quote_run_id, sort_order);

CREATE TRIGGER trg_quote_run_segments_updated_at
  BEFORE UPDATE ON quote_run_segments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE quote_run_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_org_quote_run_segments"
  ON quote_run_segments FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "users_insert_own_quote_run_segments"
  ON quote_run_segments FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "users_update_own_quote_run_segments"
  ON quote_run_segments FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "users_delete_own_quote_run_segments"
  ON quote_run_segments FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());
