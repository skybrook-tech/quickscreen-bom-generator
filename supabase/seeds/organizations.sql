-- Seed the first org with full theme config in branding JSONB
INSERT INTO organisations (name, slug, branding)
VALUES (
  'The Glass Outlet',
  'glass-outlet',
  '{"cssVars":{"--brand-bg":"#dadada","--brand-card":"#ffffff","--brand-border":"#b8b8b8","--brand-accent":"90 138 50","--brand-accent-hover":"#4a7228","--brand-muted":"#666666","--brand-text":"#1a1a1a","--brand-header-bg":"#1a1a1a","--brand-header-text":"#ffffff","--brand-radius":"0.375rem","--brand-radius-sm":"0.25rem"},"branding":{"title":"FENCE","titleItalic":"builder","subtitle":"QuickScreen aluminium slat fencing calculator","hideThemeToggle":true}}'
)
ON CONFLICT (slug) DO UPDATE SET branding = EXCLUDED.branding;

-- Salvage Phase C: suppliers #2 and #3 are their own tenants (confirmed: Discount
-- Fencing is a separate business to Glass Outlet). Each gets its own org so RLS
-- isolates their catalogues + pricing. Theme lives here on the org branding JSONB
-- (migration 027), not on the supplier row.

-- Amazing Fencing — theme adapted from fork migration 053.
INSERT INTO organisations (name, slug, branding)
VALUES (
  'Amazing Fencing',
  'amazing-fencing',
  '{"cssVars":{"--brand-bg":"#f8fafc","--brand-card":"#ffffff","--brand-border":"#cbd5e1","--brand-accent":"243 146 0","--brand-accent-hover":"#d57f00","--brand-muted":"#64748b","--brand-text":"#1e293b","--brand-header-bg":"#0d8ecf","--brand-header-text":"#ffffff","--brand-radius":"0.5rem","--brand-radius-sm":"0.375rem"},"branding":{"title":"Amazing","titleItalic":"Fencing","subtitle":"Fencing calculator","hideThemeToggle":true}}'
)
ON CONFLICT (slug) DO UPDATE SET branding = EXCLUDED.branding;

-- Discount Fencing Supplies.
INSERT INTO organisations (name, slug, branding)
VALUES (
  'Discount Fencing Supplies',
  'discount-fencing',
  '{"cssVars":{"--brand-bg":"#e9edf2","--brand-card":"#ffffff","--brand-border":"#b7c1cf","--brand-accent":"31 59 92","--brand-accent-hover":"#16304d","--brand-muted":"#5b6b7d","--brand-text":"#16243a","--brand-header-bg":"#1f3b5c","--brand-header-text":"#ffffff","--brand-radius":"0.375rem","--brand-radius-sm":"0.25rem"},"branding":{"title":"Discount","titleItalic":"Fencing","subtitle":"Fencing calculator","hideThemeToggle":true}}'
)
ON CONFLICT (slug) DO UPDATE SET branding = EXCLUDED.branding;
