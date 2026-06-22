-- ============================================================================
-- 038_staging_tables.sql  (salvage Phase B)
--
-- Staging tables for the product/price-book import pipeline: an upload is parsed
-- into staging rows, diffed against the live catalogue, approved item-by-item,
-- then promoted. Nothing here touches the live catalogue/pricing tables.
--
-- Provenance: ported from fork migration 062_staging_tables.sql. The SALVAGE-PLAN
-- kill list lists fork 062 as "re-evaluate later; only port if ImportPage
-- hard-depends on them, and say so in the PR." ImportPage (Phase B) reads/writes
-- import_runs + staging_products + staging_price_book_items directly, so it is a
-- hard dependency and is ported here, renumbered to 038. Content is unchanged
-- except this header; the admin-only RLS matches the existing migration 025
-- admin pattern.
-- ============================================================================

-- ─── Import Runs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  source_format   TEXT NOT NULL,            -- 'cin7_mass_download', 'generic_csv', etc.
  source_filename TEXT,
  status          TEXT NOT NULL DEFAULT 'parsing'
                  CHECK (status IN ('parsing','ready_for_review','approved','rejected','imported')),
  row_count       INTEGER,
  authored_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_runs_supplier ON import_runs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_import_runs_status ON import_runs(status);

-- ─── Staging Products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staging_products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  sku            TEXT,
  name           TEXT,
  raw_payload    JSONB NOT NULL,            -- the original row, verbatim
  mapped_payload JSONB,                     -- normalised against canonical product schema
  decision       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (decision IN ('pending','approve','reject','needs_review')),
  decision_note  TEXT,
  decided_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_staging_products_run ON staging_products(import_run_id);
CREATE INDEX IF NOT EXISTS idx_staging_products_sku ON staging_products(sku);
CREATE INDEX IF NOT EXISTS idx_staging_products_decision ON staging_products(decision);

-- ─── Staging Price Book Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staging_price_book_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id  UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  tier_code      TEXT NOT NULL DEFAULT 'tier1',
  min_quantity   INTEGER NOT NULL DEFAULT 1,
  price_cents    INTEGER,
  raw_payload    JSONB
);

CREATE INDEX IF NOT EXISTS idx_staging_price_book_items_run ON staging_price_book_items(import_run_id);
CREATE INDEX IF NOT EXISTS idx_staging_price_book_items_sku ON staging_price_book_items(sku);

-- ─── Row Level Security (RLS) — admin only ──────────────────────────────────
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_price_book_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_runs_admin" ON import_runs FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "staging_products_admin" ON staging_products FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "staging_price_book_items_admin" ON staging_price_book_items FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON import_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staging_price_book_items TO authenticated;
