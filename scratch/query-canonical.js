import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, organisations(slug)')
    .eq('system_type', 'AF_TIMBER_PALING');

  if (error) {
    console.error("Error products:", error);
    return;
  }
  console.log("AF_TIMBER_PALING Products in DB:");
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error);
