import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function run() {
  const { data: orgData } = await supabase
    .from('organisations')
    .select('id')
    .eq('slug', 'amazing-fencing')
    .single();
  const orgId = orgData.id;

  console.log('Products for amazing-fencing org:');
  const { data: products } = await supabase
    .from('products')
    .select('id, system_type, org_id')
    .eq('org_id', orgId);
  console.log(products);

  console.log('Rule Sets for amazing-fencing org:');
  const { data: ruleSets } = await supabase
    .from('rule_sets')
    .select('id, name, org_id')
    .eq('org_id', orgId);
  console.log(ruleSets);
}

run().catch(console.error);
