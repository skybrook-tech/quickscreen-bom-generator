import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: orgs } = await supabase.from('organisations').select('id, name, slug');
  console.log("Organisations:", orgs);

  const { data: comps } = await supabase.from('product_components').select('sku, org_id').like('sku', 'AF-%').limit(5);
  console.log("Some AF components:", comps);

  const { data: cbComps } = await supabase.from('product_components').select('sku, org_id').like('sku', 'FZSMO%').limit(5);
  console.log("Some Monument components:", cbComps);
}

main().catch(console.error);
