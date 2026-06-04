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

async function checkProductsAnon() {
  console.log("Logging in as test@glass-outlet.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@glass-outlet.com',
    password: '123456'
  });

  if (authError) {
    console.error("Login error:", authError.message);
    process.exit(1);
  }
  console.log("Logged in successfully. User ID:", authData.user?.id);

  console.log("Querying products with authenticated anon client...");
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, system_type, product_type, active');
  
  if (productError) {
    console.error("Product query error:", productError.message);
  } else {
    console.log("Products count:", products?.length);
    console.log("Products:");
    products?.forEach(p => {
      console.log(`- ${p.system_type}: ${p.name} (Active: ${p.active}, Type: ${p.product_type})`);
    });
  }
}

checkProductsAnon();
