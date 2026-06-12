import { supabase } from '../supabase';
import type { Supplier, SystemArchetype, SystemInstance } from '../../types/multiSupplier';

// All queries below are read-only. Writes happen via the admin UI in brief 035+.

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers').select('*').eq('status', 'active').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSupplier);
}

export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? rowToSupplier(data) : null;
}

export async function listAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToSupplier);
}

export async function getSystemInstanceById(id: string): Promise<SystemInstance | null> {
  const { data, error } = await supabase
    .from('system_instances').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? rowToSystemInstance(data) : null;
}

export async function listArchetypes(): Promise<SystemArchetype[]> {
  const { data, error } = await supabase
    .from('system_archetypes').select('*').eq('status', 'active').order('family').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToArchetype);
}

export async function listSystemInstances(opts: {
  supplierId?: string;
  archetypeId?: string;
  status?: 'active' | 'hidden' | 'draft' | 'discontinued';
} = {}): Promise<SystemInstance[]> {
  let q = supabase.from('system_instances').select('*');
  if (opts.supplierId) q = q.eq('supplier_id', opts.supplierId);
  if (opts.archetypeId) q = q.eq('archetype_id', opts.archetypeId);
  if (opts.status) q = q.eq('status', opts.status);
  q = q.order('name');
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToSystemInstance);
}

function rowToSupplier(row: any): Supplier {
  return {
    id: row.id, slug: row.slug, name: row.name,
    logoUrl: row.logo_url ?? undefined,
    brandColour: row.brand_colour ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    trustTier: row.trust_tier,
    authoredBy: row.authored_by ?? undefined,
    orgId: row.org_id ?? undefined,
    status: row.status, metadata: row.metadata ?? undefined,
    customBrandingLogo: row.custom_branding_logo ?? undefined,
    customBrandingBanner: row.custom_branding_banner ?? undefined,
    customBrandingStyles: row.custom_branding_styles ?? undefined,
    installs_enabled: row.installs_enabled ?? false,
    postcodes_serviced: row.postcodes_serviced ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function rowToArchetype(row: any): SystemArchetype {
  return {
    id: row.id, slug: row.slug, name: row.name, family: row.family,
    geometryModule: row.geometry_module,
    variableSchema: row.variable_schema ?? {},
    ruleTemplateIds: row.rule_template_ids ?? [],
    description: row.description ?? undefined,
    status: row.status, metadata: row.metadata ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
function rowToSystemInstance(row: any): SystemInstance {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    archetypeId: row.archetype_id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    readinessStatus: row.readiness_status,
    trustTier: row.trust_tier,
    visibility: row.visibility,
    authoredBy: row.authored_by ?? undefined,
    orgId: row.org_id ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    readinessNotes: row.readiness_notes ?? undefined,
    metadata: row.metadata ?? undefined,
    calculatorClonedFrom: row.calculator_cloned_from ?? undefined,
    aiVettingStatus: row.ai_vetting_status ?? undefined,
    aiVettingNotes: row.ai_vetting_notes ?? undefined,
    isPublicLibrary: row.is_public_library ?? false,
    isNewProduct: row.is_new_product ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}