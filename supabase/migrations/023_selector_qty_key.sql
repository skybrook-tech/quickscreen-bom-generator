-- 023_selector_qty_key.sql
--
-- Adds qty_key to product_component_selectors.
--
-- qty_key names the segCtx variable that holds the quantity for this selector.
-- Each (component_category, qty_key) pair is an independent line item group;
-- the first matching selector in priority order wins the SKU for that group.
-- Selectors with NULL qty_key are skipped by the engine with a warning.

ALTER TABLE product_component_selectors
  ADD COLUMN IF NOT EXISTS qty_key TEXT;
