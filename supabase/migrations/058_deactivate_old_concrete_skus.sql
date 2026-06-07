-- Deactivate old concrete components under the amazing-fencing organisation
UPDATE public.product_components
SET active = false
WHERE sku IN ('DMR3056LD', 'DMPM3056LD', 'CG2CD')
  AND org_id = (SELECT id FROM public.organisations WHERE slug = 'amazing-fencing');
