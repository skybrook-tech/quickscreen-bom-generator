-- 022_flatten_products.sql
--
-- Flatten the product hierarchy and add product_type + compatibility.
--
-- Before: products formed a two-level tree (QUICKSCREEN root → QSHS variant,
--         etc.) via parent_id; gate products (QSHS_GATE) were variants of
--         that root. Two partial unique indexes enforced uniqueness
--         (one for roots, one for variants).
--
-- After: every product is top-level. parent_id stays as a column but is no
--        longer populated. A single non-partial UNIQUE(org_id, system_type)
--        replaces the two partial indexes (simpler; also what supabase-js
--        `.upsert({ onConflict: 'org_id,system_type' })` can target).
--        product_type distinguishes fences from gates; gates list which
--        fence system_types they are compatible with.

BEGIN;

-- ─── Add new columns ────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN product_type TEXT NOT NULL DEFAULT 'fence'
    CHECK (product_type IN ('fence', 'gate', 'other')),
  ADD COLUMN compatible_with_system_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ─── Swap the partial unique indexes for a single global one ───────────────
DROP INDEX IF EXISTS uq_products_root;
DROP INDEX IF EXISTS uq_products_variant;

CREATE UNIQUE INDEX uq_products_system_type
  ON products (org_id, system_type);

-- The check_product_parent_org trigger stays (it's a no-op when parent_id
-- is NULL, which is the new convention). Harmless for any legacy row that
-- might still set parent_id.

COMMIT;
