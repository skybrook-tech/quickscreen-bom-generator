// scratch/simulate-queries.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const orgId = 'f575224f-0ffa-4e1b-99ee-e7da83049efb';
  const tier = 'tier1';

  console.log("Simulating loadPricing with orgId:", orgId, "and tier:", tier);
  const { data: pricingData, error: pricingErr } = await supabase
    .from("pricing_rules_with_sku")
    .select("sku, price, rule, priority")
    .eq("org_id", orgId)
    .eq("tier_code", tier)
    .eq("active", true)
    .order("priority", { ascending: false });

  if (pricingErr) {
    console.error("loadPricing failed:", pricingErr);
  } else {
    console.log(`loadPricing returned ${pricingData?.length} rows.`);
    const matchingPost = pricingData.find(r => r.sku === 'DF-POST-100x75-1800');
    console.log("Matching pricing rule for DF-POST-100x75-1800:", matchingPost);
  }

  console.log("\nSimulating loadComponentNames with orgId:", orgId);
  const { data: compData, error: compErr } = await supabase
    .from("product_components")
    .select("sku, name, description, default_price")
    .eq("org_id", orgId)
    .eq("active", true);

  if (compErr) {
    console.error("loadComponentNames failed:", compErr);
  } else {
    console.log(`loadComponentNames returned ${compData?.length} rows.`);
    const matchingPostComp = compData.find(r => r.sku === 'DF-POST-100x75-1800');
    console.log("Matching component name for DF-POST-100x75-1800:", matchingPostComp);
    
    // Print all DF components returned
    console.log("\nAll returned DF components:");
    compData.filter(c => c.sku.startsWith("DF-")).forEach(c => {
      console.log(`- ${c.sku}: defaultPrice = ${c.default_price}, name = ${c.name}`);
    });
  }
}

main();
