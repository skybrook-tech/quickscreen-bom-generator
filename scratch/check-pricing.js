import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: org } = await supabase.from('organisations').select('*').eq('slug', 'glass-outlet').single();

  const { data: comp } = await supabase
    .from('product_components')
    .select('sku, id, active, default_price')
    .eq('org_id', org.id)
    .eq('sku', 'DF-POST-100x75-1800')
    .single();

  console.log("DF-POST-100x75-1800 component row:");
  console.log(JSON.stringify(comp, null, 2));
}

main();
