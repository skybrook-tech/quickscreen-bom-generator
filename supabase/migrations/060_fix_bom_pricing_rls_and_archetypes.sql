-- ============================================================================
-- 060_fix_bom_pricing_rls_and_archetypes.sql
--
-- Populates the timber-paling archetype, maps related system instances to it,
-- creates public SELECT policy for system_archetypes, and secures pricing_rules
-- by dropping the anonymous SELECT policy.
-- ============================================================================

-- 1. Insert the 'timber-paling' archetype
INSERT INTO public.system_archetypes (slug, name, family, geometry_module, rule_template_ids, description, status)
VALUES (
  'timber-paling',
  'Timber Paling',
  'fence',
  'fence_runs_v1',
  ARRAY['paling_count_v1', 'rail_per_bay_v1', 'bay_post_v1'],
  'Treated pine and hardwood paling fencing systems.',
  'active'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    family = EXCLUDED.family,
    geometry_module = EXCLUDED.geometry_module,
    rule_template_ids = EXCLUDED.rule_template_ids,
    description = EXCLUDED.description,
    status = EXCLUDED.status;

-- 2. Update system_instances for timber paling to use the new archetype
UPDATE public.system_instances
SET archetype_id = (SELECT id FROM public.system_archetypes WHERE slug = 'timber-paling')
WHERE slug IN ('amazing-timber-paling', 'dfsau-cca-pine-paling');

-- 3. Add public read policy for system_archetypes
CREATE POLICY "system_archetypes_anon_read" ON public.system_archetypes FOR SELECT TO public
  USING (status = 'active');

-- 4. Secure pricing_rules: Drop the public read policy on raw pricing rules
DROP POLICY IF EXISTS "pricing_rules_anon_read" ON public.pricing_rules;
