import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('system_type', 'AF_COLORBOND')
    .maybeSingle();

  console.log("AF_COLORBOND product:", product);

  if (product) {
    const { data: ruleSet } = await supabase
      .from('rule_sets')
      .select('*')
      .eq('product_id', product.id)
      .maybeSingle();
    console.log("Rule set:", ruleSet);

    if (ruleSet) {
      const { data: ruleVersions } = await supabase
        .from('rule_versions')
        .select('*')
        .eq('rule_set_id', ruleSet.id);
      console.log("Rule versions:", ruleVersions);
    }

    const { data: variables } = await supabase
      .from('product_variables')
      .select('*')
      .eq('product_id', product.id);
    console.log("Variables:", variables?.length, variables);

    const { data: rules } = await supabase
      .from('product_rules')
      .select('*')
      .eq('version_id', (await supabase.from('rule_versions').select('id').eq('rule_set_id', ruleSet.id).eq('is_current', true).single()).data.id)
      .order('stage')
      .order('priority');
    console.log("Rules:", rules?.length);
    rules?.forEach(r => {
      console.log(`- [${r.stage}] ${r.name}: ${r.expression} -> ${r.output_key}`);
    });

    const { data: selectors } = await supabase
      .from('product_component_selectors')
      .select('*')
      .eq('product_id', product.id)
      .order('priority');
    console.log("Selectors:", selectors?.length);
    selectors?.forEach(s => {
      console.log(`- ${s.component_category} (${s.selector_key}): match: ${JSON.stringify(s.match_json)}, pattern: ${s.sku_pattern}`);
    });
  }
}

main().catch(console.error);
