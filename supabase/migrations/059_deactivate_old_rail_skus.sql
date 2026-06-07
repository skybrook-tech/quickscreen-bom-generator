-- Deactivate old rail components under the amazing-fencing organisation to resolve canonical collisions with seeded SKUs
UPDATE public.product_components
SET active = false
WHERE sku IN ('hw75x38x4800', 'pr75x38x4800', 'pr100x38x4800', 'hw100x38x4800')
  AND org_id = (SELECT id FROM public.organisations WHERE slug = 'amazing-fencing');
