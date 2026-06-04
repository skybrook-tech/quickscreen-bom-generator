-- ============================================================================
-- 053_update_amazing_fencing_branding.sql
-- ============================================================================

UPDATE suppliers
SET brand_colour = '#0d8ecf',
    custom_branding_styles = '{
      "--brand-bg": "#f8fafc",
      "--brand-card": "#ffffff",
      "--brand-border": "#cbd5e1",
      "--brand-primary": "13 142 207",
      "--brand-accent": "243 146 0",
      "--brand-accent-hover": "#d57f00",
      "--brand-muted": "#64748b",
      "--brand-text": "#1e293b",
      "--brand-header-bg": "#0d8ecf",
      "--brand-header-text": "#ffffff",
      "--brand-radius": "0.5rem",
      "--brand-radius-sm": "0.375rem"
    }'::jsonb
WHERE slug = 'amazing-fencing';
