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

async function checkPricingAnon() {
  console.log("Querying pricing_rules as unauthenticated user...");
  const { data: pricingRules, error: pricingError } = await supabase
    .from('pricing_rules')
    .select('*')
    .limit(5);

  if (pricingError) {
    console.log("Unauthenticated Query: BLOCKED (Correct! Error:", pricingError.message, ")");
  } else {
    console.error("Unauthenticated Query: EXPOSED (Bug! Rows returned:", pricingRules?.length, ")");
  }

  console.log("Logging in as test@glass-outlet.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@glass-outlet.com',
    password: '123456'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    process.exit(1);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  console.log("Logged in user profile:", profile);

  console.log("Querying pricing_rules as authenticated user...");
  const { data: pricingRulesAuth, error: pricingErrorAuth } = await supabase
    .from('pricing_rules')
    .select('*')
    .limit(5);

  if (pricingErrorAuth) {
    console.log("Authenticated Query: BLOCKED (Correct! Error:", pricingErrorAuth.message, ")");
  } else {
    console.error("Authenticated Query: EXPOSED (Bug! Rows returned:", pricingRulesAuth?.length, ")");
  }
}

checkPricingAnon();
