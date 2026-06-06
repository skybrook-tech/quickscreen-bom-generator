import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: org } = await supabase.from('organisations').select('id').eq('slug', 'amazing-fencing').single();
  const orgId = org.id;

  const { data: comps, error } = await supabase
    .from('product_components')
    .select('sku, name, category, canonical_code')
    .eq('org_id', orgId)
    .ilike('name', '%gate%');

  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log(`Found ${comps.length} gate components:`);
  console.log(comps.slice(0, 30));
}

main().catch(console.error);
