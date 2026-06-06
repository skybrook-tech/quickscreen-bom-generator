import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: org } = await supabase.from('organisations').select('*').eq('slug', 'amazing-fencing').single();
  console.log("Org:", org.id);

  const { data: comp } = await supabase
    .from('product_components')
    .select('sku, id, active, default_price, name, system_types')
    .eq('org_id', org.id)
    .eq('sku', 'FNPMO24')
    .maybeSingle();

  console.log("FNPMO24 component row:");
  console.log(JSON.stringify(comp, null, 2));

  // Let's also check concrete SKU DMPM3056LD
  const { data: concComp } = await supabase
    .from('product_components')
    .select('sku, id, active, default_price, name, system_types')
    .eq('org_id', org.id)
    .eq('sku', 'DMPM3056LD')
    .maybeSingle();

  console.log("DMPM3056LD component row:");
  console.log(JSON.stringify(concComp, null, 2));

  // Let's also check gate SKU 0001
  const { data: gateComp } = await supabase
    .from('product_components')
    .select('sku, id, active, default_price, name, system_types')
    .eq('org_id', org.id)
    .eq('sku', '0001')
    .maybeSingle();

  console.log("0001 component row:");
  console.log(JSON.stringify(gateComp, null, 2));

  // Let's check pricing rule for FZSMO17
  if (comp) {
    const { data: pricing } = await supabase
      .from('pricing_rules_with_sku')
      .select('*')
      .eq('org_id', org.id)
      .eq('sku', 'FZSMO17');
    console.log("Pricing rules for FZSMO17:");
    console.log(JSON.stringify(pricing, null, 2));
  }
}

main().catch(console.error);
