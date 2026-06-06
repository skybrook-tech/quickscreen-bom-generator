import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing supabase URL or service role key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkProducts() {
  console.log("Querying organisations...");
  const { data: orgs, error: orgError } = await supabase.from('organisations').select('*');
  if (orgError) {
    console.error("Orgs error:", orgError);
  } else {
    console.log("Orgs:", orgs);
  }

  console.log("Querying products...");
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, system_type, product_type, active, org_id, supplier_id, system_instance_id');
  if (productError) {
    console.error("Product error:", productError);
  } else {
    console.log("Products count:", products?.length);
    console.log("Products:");
    products?.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.name}, SystemType: ${p.system_type}, Type: ${p.product_type}, Active: ${p.active}, Org: ${p.org_id}, Supplier: ${p.supplier_id}`);
    });
  }
}

checkProducts();
