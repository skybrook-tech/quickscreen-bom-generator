// scratch/query-suppliers.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: suppliers, error } = await supabase.from('suppliers').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log("Suppliers in db:", suppliers);
  }
}

main();
