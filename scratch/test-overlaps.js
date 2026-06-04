// scratch/test-overlaps.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const orgId = 'f575224f-0ffa-4e1b-99ee-e7da83049efb';
  const codes = ['DF_CCA_PAL'];

  console.log("Testing overlaps filter on product_components with system_types =", codes);
  const { data, error } = await supabase
    .from("product_components")
    .select("sku, name, system_types")
    .eq("org_id", orgId)
    .eq("active", true)
    .overlaps("system_types", codes);

  if (error) {
    console.error("Overlaps query failed:", error);
  } else {
    console.log(`Overlaps query returned ${data?.length} components.`);
    data.forEach(c => {
      console.log(`- ${c.sku}: system_types =`, c.system_types);
    });
  }
}

main();
