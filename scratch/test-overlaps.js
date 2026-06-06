import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: org } = await supabase.from('organisations').select('*').eq('slug', 'amazing-fencing').single();
  const systemTypes = ['AF_COLORBOND', 'QS_GATE'];

  const { data, error } = await supabase
    .from("product_components")
    .select("sku, name, description, default_price, canonical_code, category, metadata, system_types")
    .eq("org_id", org.id)
    .eq("active", true)
    .overlaps("system_types", systemTypes);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Fetched ${data.length} components.`);
  const found = data.find(c => c.sku === 'FNPMO24');
  console.log("FNPMO24 in fetched data:", JSON.stringify(found, null, 2));
}

main().catch(console.error);
