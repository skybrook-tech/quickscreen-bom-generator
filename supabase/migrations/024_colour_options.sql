-- 023_colour_options.sql
-- Adds a global colour_options table (per-org) and extends product_variables
-- with an options_group column so colour_code can point to this shared table.

CREATE TABLE colour_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  value         TEXT NOT NULL,                         -- e.g. "black-satin"
  short_code    TEXT NOT NULL,                         -- e.g. "B"
  label         TEXT NOT NULL,                         -- e.g. "Black Satin"
  finish_group  TEXT NOT NULL DEFAULT 'standard',      -- "standard" | "alumawood"
  limited       BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT  NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, value)
);

ALTER TABLE product_variables
  ADD COLUMN IF NOT EXISTS options_group TEXT;  -- e.g. "colours" or NULL

ALTER TABLE colour_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_colour_options"
  ON colour_options FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

GRANT SELECT ON colour_options TO authenticated;
