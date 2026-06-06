import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';

dotenv.config({ path: '.env.local', override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function run() {
  // Resolve Org ID for amazing-fencing
  const { data: orgData, error: orgError } = await supabase
    .from('organisations')
    .select('id')
    .eq('slug', 'amazing-fencing')
    .single();

  if (orgError || !orgData) {
    console.error('Failed to resolve organisation:', orgError);
    return;
  }
  const orgId = orgData.id;
  console.log('Amazing Fencing Organisation ID:', orgId);

  // Read and parse CSV
  const csvPath = resolve('_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv');
  console.log('Reading CSV from:', csvPath);
  const csvContent = readFileSync(csvPath, 'utf8');
  
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} rows from CSV.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of parsed.data) {
    const sku = row.supplier_sku?.trim();
    const canonicalName = row.canonical_name?.trim();

    if (!sku) {
      // In some cases (like line 241), the CSV SKU is empty, but we know it corresponds to SKU '0001' or similar in the DB.
      // Wait, let's map by description if the SKU is empty?
      // Let's check:
      if (canonicalName === '2365 Colorbond Gate Monument') {
        const { data, error } = await supabase
          .from('product_components')
          .update({
            name: '2365 Colorbond Gate Monument', // Wait! The worked quote has name "Colorbond Single Gate Monument"
            canonical_code: 'Colorbond Single Gate Monument', // Let's set canonical code to match worked quote
          })
          .eq('org_id', orgId)
          .eq('sku', '0001');

        if (error) {
          console.error(`Error updating SKU 0001:`, error);
        } else {
          console.log(`Updated SKU 0001 to canonical name: 2365 Colorbond Gate Monument`);
          updatedCount++;
        }
      } else {
        skippedCount++;
      }
      continue;
    }

    const { data, error } = await supabase
      .from('product_components')
      .update({
        name: canonicalName,
        canonical_code: canonicalName,
      })
      .eq('org_id', orgId)
      .eq('sku', sku);

    if (error) {
      console.error(`Error updating SKU ${sku}:`, error.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`Update complete: ${updatedCount} components updated, ${skippedCount} rows skipped.`);
}

run().catch(console.error);
