-- 007_add_quote_number.sql
-- Add a sequential quote number per org, auto-assigned on insert.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_number INTEGER NOT NULL DEFAULT 0;

-- Backfill existing quotes with sequential numbers per org (ordered by created_at)
DO $$
DECLARE
  org RECORD;
  q   RECORD;
  n   INTEGER;
BEGIN
  FOR org IN (SELECT DISTINCT org_id FROM quotes) LOOP
    n := 1;
    FOR q IN (
      SELECT id FROM quotes
      WHERE org_id = org.org_id
      ORDER BY created_at ASC
    ) LOOP
      UPDATE quotes SET quote_number = n WHERE id = q.id;
      n := n + 1;
    END LOOP;
  END LOOP;
END $$;

-- Trigger function: assigns next quote_number per org on insert
CREATE OR REPLACE FUNCTION public.assign_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = 0 THEN
    SELECT COALESCE(MAX(quote_number), 0) + 1
    INTO NEW.quote_number
    FROM quotes
    WHERE org_id = NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_quote_number ON quotes;
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION public.assign_quote_number();
