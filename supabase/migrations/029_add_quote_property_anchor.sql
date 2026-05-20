-- 029_add_quote_property_anchor.sql
-- Stores the confirmed Google Maps property anchor for v3 calculator jobs.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS property_anchor JSONB;

COMMENT ON COLUMN quotes.property_anchor IS
  'Nullable property anchor for map-first calculator jobs: { lat, lng, address }.';
