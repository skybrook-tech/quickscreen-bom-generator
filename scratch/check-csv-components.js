import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const orgSlug = 'amazing-fencing';
  const { data: org } = await supabase.from('organisations').select('id').eq('slug', orgSlug).single();
  const orgId = org.id;

  const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
  const csvContent = readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Parse CSV (simple split on comma, ignoring nested commas inside quotes if any)
  const headers = lines[0].split(',');
  const skuIdx = headers.indexOf('supplier_sku');
  const nameIdx = headers.indexOf('canonical_name');
  
  const csvItems = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const sku = row[skuIdx]?.trim();
    const canonicalName = row[nameIdx]?.trim();
    csvItems.push({ sku, canonicalName, rowLine: lines[i] });
  }

  console.log(`Parsed ${csvItems.length} items from CSV.`);

  // Load existing components for Amazing Fencing
  const { data: dbComps, error } = await supabase
    .from('product_components')
    .select('sku, canonical_code')
    .eq('org_id', orgId);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const dbSkuSet = new Set(dbComps.map(c => c.sku));
  const missing = csvItems.filter(item => !dbSkuSet.has(item.sku));

  console.log(`Total database components for org ${orgSlug}: ${dbComps.length}`);
  console.log(`Missing components from DB: ${missing.length}`);
  if (missing.length > 0) {
    console.log("First 10 missing components:");
    missing.slice(0, 10).forEach(m => console.log(`- SKU: "${m.sku}", Canonical: "${m.canonicalName}"`));
  }
}

main().catch(console.error);
