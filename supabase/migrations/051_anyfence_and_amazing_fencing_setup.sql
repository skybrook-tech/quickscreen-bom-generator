-- ============================================================================
-- 051_anyfence_and_amazing_fencing_setup.sql
-- ============================================================================

-- 1. Rename Glass Outlet organisation to Anyfence and update branding
UPDATE organisations
SET name = 'Anyfence',
    branding = '{"cssVars":{"--brand-bg":"#f1f5f9","--brand-card":"#ffffff","--brand-border":"#cbd5e1","--brand-accent":"16 185 129","--brand-accent-hover":"#059669","--brand-muted":"#64748b","--brand-text":"#0f172a","--brand-header-bg":"#0f172a","--brand-header-text":"#ffffff","--brand-radius":"0.5rem","--brand-radius-sm":"0.375rem"},"branding":{"title":"AnyFence","titleItalic":"","subtitle":"Mapping & Slat Fencing Calculator","hideThemeToggle":false}}'
WHERE slug = 'glass-outlet';

-- 2. Insert new organisation for Amazing Fencing
INSERT INTO organisations (name, slug, branding)
VALUES (
  'Amazing Fencing',
  'amazing-fencing',
  '{"cssVars":{"--brand-bg":"#f8fafc","--brand-card":"#ffffff","--brand-border":"#e2e8f0","--brand-primary":"13 142 207","--brand-accent":"243 146 0","--brand-accent-hover":"#d57f00","--brand-muted":"#64748b","--brand-text":"#1e293b","--brand-header-bg":"#0d8ecf","--brand-header-text":"#ffffff","--brand-radius":"0.5rem","--brand-radius-sm":"0.375rem"},"branding":{"title":"Amazing Fencing","titleItalic":"","subtitle":"Trade & DIY Supplies","hideThemeToggle":true}}'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    branding = EXCLUDED.branding;

-- 3. Link amazing-fencing supplier to the newly created organization
UPDATE suppliers
SET org_id = (SELECT id FROM organisations WHERE slug = 'amazing-fencing')
WHERE slug = 'amazing-fencing';
