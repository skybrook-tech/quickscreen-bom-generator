import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: comp } = await supabase
    .from('product_components')
    .select('sku, name, description')
    .eq('sku', 'FNSJA18')
    .single();

  console.log("FNSJA18 details:", comp);
}

main().catch(console.error);
