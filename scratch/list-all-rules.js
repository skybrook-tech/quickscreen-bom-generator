import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: orgs } = await supabase.from('organisations').select('id, name, slug');
  console.log("Organisations:", orgs);

  const { data: suppliers } = await supabase.from('suppliers').select('id, name, slug, org_id');
  console.log("\nSuppliers:", suppliers);

  const { data: instances } = await supabase.from('system_instances').select('id, name, slug, supplier_id, archetype_id');
  console.log("\nSystem Instances:", instances?.map(i => ({
    name: i.name,
    slug: i.slug,
    supplier: suppliers?.find(s => s.id === i.supplier_id)?.slug
  })));

  const { data: products } = await supabase.from('products').select('id, name, system_type, org_id, product_type');
  console.log("\nProducts in DB:", products?.map(p => ({
    name: p.name,
    system_type: p.system_type,
    org: orgs?.find(o => o.id === p.org_id)?.slug,
    product_type: p.product_type
  })));

  const { data: ruleSets } = await supabase.from('rule_sets').select('id, name, product_id, org_id');
  console.log("\nRule Sets in DB:", ruleSets?.map(rs => ({
    name: rs.name,
    product: products?.find(p => p.id === rs.product_id)?.system_type,
    org: orgs?.find(o => o.id === rs.org_id)?.slug
  })));
}

main().catch(console.error);
