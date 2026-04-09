-- 009_add_product_image_url.sql
--
-- Adds image_url column to products table.
-- URLs are populated by the seed-images.js script after db reset.

ALTER TABLE products ADD COLUMN image_url TEXT;
