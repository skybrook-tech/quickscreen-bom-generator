-- ============================================================================
-- 054_clean_up_amazing_fencing_calculators.sql
-- ============================================================================

UPDATE system_instances
SET status = 'hidden'
WHERE supplier_id = (SELECT id FROM suppliers WHERE slug = 'amazing-fencing')
  AND slug IN ('amazing-chainwire-security', 'amazing-permasteel', 'amazing-timber-slat-screen');
