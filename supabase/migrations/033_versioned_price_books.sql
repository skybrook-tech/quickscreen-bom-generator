-- ============================================================================
-- 033_versioned_price_books.sql
-- (ported from fork migration 034, renumbered for main — salvage Phase A)
--
-- Versioned price books: a published price book is an immutable snapshot of a
-- supplier's pricing. Quotes pin to a price_book version so old quotes keep
-- their original pricing when a new book is published. resolve_price_cents()
-- prefers the active published book, falling back to legacy pricing_rules.
--
-- RLS note (salvage Phase A): the fork made *published* books world-readable to
-- any authenticated user, which would leak one supplier's pricing to another.
-- 037_multi_supplier_rls.sql REPLACES the read policies created here with
-- org-scoped ones. The policies below are the fork baseline and are immediately
-- tightened by 037 in the same migration run.
-- ============================================================================

-- ─── Price books (a versioned snapshot of pricing for a supplier) ──────────
CREATE TABLE price_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  source_file     TEXT,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','reviewed','published','archived')),
  published_at    TIMESTAMPTZ,
  published_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  authored_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_books_supplier ON price_books(supplier_id);
CREATE INDEX idx_price_books_status   ON price_books(status);
CREATE INDEX idx_price_books_active   ON price_books(supplier_id, status, effective_from)
  WHERE status = 'published';

-- ─── Price book items (per-SKU per-tier per-qty-break) ─────────────────────
CREATE TABLE price_book_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_book_id  UUID NOT NULL REFERENCES price_books(id) ON DELETE CASCADE,
  sku            TEXT NOT NULL,
  tier_code      TEXT NOT NULL DEFAULT 'tier1',
  min_quantity   INTEGER NOT NULL DEFAULT 1,
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  currency       TEXT NOT NULL DEFAULT 'AUD',
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_book_id, sku, tier_code, min_quantity)
);

CREATE INDEX idx_price_book_items_book ON price_book_items(price_book_id);
CREATE INDEX idx_price_book_items_lookup
  ON price_book_items(price_book_id, sku, tier_code, min_quantity DESC);

-- ─── Quote pinning ──────────────────────────────────────────────────────────
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS price_book_version_id UUID REFERENCES price_books(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_price_book_version
  ON quotes(price_book_version_id) WHERE price_book_version_id IS NOT NULL;

-- ─── Updated_at trigger ─────────────────────────────────────────────────────
CREATE TRIGGER trigger_price_books_updated_at
  BEFORE UPDATE ON price_books
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE price_books      ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;

-- NOTE (salvage Phase A): the SELECT (read) policy for price_books is created in
-- 037_multi_supplier_rls.sql, NOT here. The fork's original read policy made every
-- PUBLISHED book world-readable to any authenticated user, leaking one supplier's
-- pricing to another. We deliberately do NOT create that policy. With RLS enabled
-- and no SELECT policy, price_books is deny-by-default for reads — so even a
-- migration run that stops before 037 leaves the table SECURE (unreadable), never
-- world-readable. 037 then adds the org-scoped read policy.
CREATE POLICY "price_books_insert" ON price_books FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (authored_by IS NULL OR authored_by = auth.uid())
  );

CREATE POLICY "price_books_update_author" ON price_books FOR UPDATE TO authenticated
  USING (authored_by = auth.uid() AND status IN ('draft','reviewed'))
  WITH CHECK (authored_by = auth.uid());

CREATE POLICY "price_books_update_admin" ON price_books FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "price_books_delete_admin" ON price_books FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON price_books TO authenticated;

-- price_book_items: SELECT (read) policy is likewise created in 037 (org-scoped,
-- following the parent book). Deny-by-default for reads until then. Admin writes only.
CREATE POLICY "price_book_items_write_admin" ON price_book_items FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON price_book_items TO authenticated;

-- ─── Resolver helper (SQL function for the edge function to call) ──────────
-- Returns the effective price_cents for (supplier, sku, tier, quantity, at_time).
-- Prefers the active published price_book; falls back to legacy pricing_rules
-- (which stores price NUMERIC dollars → translated × 100 to cents here).

CREATE OR REPLACE FUNCTION public.resolve_price_cents(
  p_supplier_id UUID,
  p_sku         TEXT,
  p_tier_code   TEXT DEFAULT 'tier1',
  p_quantity    INTEGER DEFAULT 1,
  p_at          TIMESTAMPTZ DEFAULT now()
) RETURNS INTEGER
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_price_cents INTEGER;
  v_price_dollars NUMERIC(10,2);
BEGIN
  -- Path 1: active published price book (new, native cents)
  SELECT pbi.price_cents INTO v_price_cents
    FROM price_book_items pbi
    JOIN price_books pb ON pb.id = pbi.price_book_id
   WHERE pb.supplier_id = p_supplier_id
     AND pb.status = 'published'
     AND pb.effective_from <= p_at
     AND (pb.effective_to IS NULL OR pb.effective_to > p_at)
     AND pbi.sku = p_sku
     AND pbi.tier_code = p_tier_code
     AND pbi.min_quantity <= p_quantity
   ORDER BY pbi.min_quantity DESC
   LIMIT 1;
  IF v_price_cents IS NOT NULL THEN RETURN v_price_cents; END IF;

  -- Path 2: legacy pricing_rules fallback. Join via pricing_rules_with_sku VIEW
  -- (created in migration 008) which exposes sku via product_components.
  -- Price is NUMERIC(10,2) dollars → multiply by 100 to return cents.
  --
  -- Scoped to the requested supplier's org so that, if two suppliers ever share a
  -- SKU, the fallback returns the right supplier's price instead of whichever row
  -- wins on priority. (suppliers.org_id is populated at seed time; this runs at
  -- request time, by which point it is set.)
  SELECT prws.price INTO v_price_dollars
    FROM pricing_rules_with_sku prws
   WHERE prws.sku = p_sku
     AND prws.tier_code = p_tier_code
     AND prws.active = TRUE
     AND prws.org_id = (SELECT org_id FROM suppliers WHERE id = p_supplier_id)
     AND (prws.valid_from IS NULL OR prws.valid_from <= p_at)
     AND (prws.valid_to   IS NULL OR prws.valid_to   >  p_at)
   ORDER BY prws.priority DESC
   LIMIT 1;
  IF v_price_dollars IS NOT NULL THEN
    RETURN ROUND(v_price_dollars * 100)::INTEGER;
  END IF;

  RETURN NULL;
END $$;

-- Service-role-only access to match the existing pricing_rules / pricing_rules_with_sku grants.
REVOKE ALL ON FUNCTION public.resolve_price_cents(UUID, TEXT, TEXT, INTEGER, TIMESTAMPTZ) FROM anon, authenticated;