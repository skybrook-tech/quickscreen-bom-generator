import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: comp } = await supabase
    .from('product_components')
    .select('sku, name, description, canonical_code, metadata')
    .eq('sku', 'FZSJA17')
    .single();

  console.log("FZSJA17 details:", comp);
}

main().catch(console.error);
