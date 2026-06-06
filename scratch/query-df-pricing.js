// scratch/query-df-pricing.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Checking component: DF-POST-100x75-1800...");
  const { data: comp, error: compErr } = await supabase
    .from('product_components')
    .select('*')
    .eq('sku', 'DF-POST-100x75-1800')
    .single();

  if (compErr) {
    console.error("Error fetching component:", compErr);
    return;
  }
  console.log("Component details:", comp);

  console.log("\nChecking pricing_rules for this component id:", comp.id);
  const { data: rules, error: rulesErr } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('component_id', comp.id);

  if (rulesErr) {
    console.error("Error fetching pricing rules:", rulesErr);
  } else {
    console.log("pricing_rules rows:", rules);
  }

  console.log("\nChecking pricing_rules_with_sku for SKU: DF-POST-100x75-1800...");
  const { data: viewRules, error: viewRulesErr } = await supabase
    .from('pricing_rules_with_sku')
    .select('*')
    .eq('sku', 'DF-POST-100x75-1800');

  if (viewRulesErr) {
    console.error("Error fetching pricing rules from view:", viewRulesErr);
  } else {
    console.log("pricing_rules_with_sku view rows:", viewRules);
  }
  
  console.log("\nChecking pricing_rules_with_sku for all tier1 & active rules with SKU starting with DF-...");
  const { data: allDfRules, error: allDfRulesErr } = await supabase
    .from('pricing_rules_with_sku')
    .select('sku, tier_code, price, active, org_id')
    .like('sku', 'DF-%');
    
  if (allDfRulesErr) {
    console.error("Error fetching all DF rules:", allDfRulesErr);
  } else {
    console.log(`Found ${allDfRules.length} pricing rules for DF components:`);
    allDfRules.forEach(r => {
      console.log(`- ${r.sku} (${r.tier_code}): $${r.price}, active: ${r.active}, org_id: ${r.org_id}`);
    });
  }
}

main();
