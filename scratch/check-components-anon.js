import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing supabase URL or anon key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkComponents() {
  console.log("Logging in as test@glass-outlet.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@glass-outlet.com',
    password: '123456'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    process.exit(1);
  }

  console.log("Querying product components as authenticated client...");
  const { data, error } = await supabase
    .from('product_components')
    .select('id, sku, name, category, system_instance_id')
    .contains('system_types', ['QSHS'])
    .limit(5);

  if (error) {
    console.error("Error querying product components:", error.message);
  } else {
    console.log("Successfully retrieved components count:", data?.length);
    console.log("Components sample:");
    data?.forEach(c => {
      console.log(`- ${c.sku}: ${c.name} (system_instance_id: ${c.system_instance_id})`);
    });
  }
}

checkComponents();

