import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';

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
  
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  console.log(`Parsed ${parsed.data.length} items from CSV.`);

  // Load existing components for Amazing Fencing
  const { data: dbComps, error } = await supabase
    .from('product_components')
    .select('sku')
    .eq('org_id', orgId);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const dbSkuSet = new Set(dbComps.map(c => c.sku));
  const missingRows = parsed.data.filter(row => !dbSkuSet.has(row.supplier_sku?.trim()));

  console.log(`Missing components from DB: ${missingRows.length}`);

  // We want to generate SQL to insert these missing components
  let sql = `-- Add missing product components for Amazing Fencing (Brief 047)\n`;
  sql += `WITH af_org AS (SELECT id FROM organisations WHERE slug = 'amazing-fencing')\n`;
  sql += `INSERT INTO product_components (org_id, sku, name, description, category, unit, default_price, system_types, active, metadata)\nVALUES\n`;

  const valuesSqls = [];
  for (const row of missingRows) {
    const sku = row.supplier_sku.trim();
    const name = row.canonical_name.trim();
    const desc = row.description ? row.description.trim() : name;
    const csvCategory = row.category ? row.category.trim() : '';
    const csvSystem = row.system ? row.system.trim().toLowerCase() : '';
    
    // Map system types
    let systemTypes = "ARRAY['AF_COLORBOND']";
    if (csvSystem === 'timber') {
      systemTypes = "ARRAY['AF_TIMBER_PALING']";
    }

    // Map category
    let category = 'accessory';
    if (csvCategory === 'Post') {
      category = 'post';
    } else if (csvCategory === 'Rail') {
      category = 'rail';
    } else if (csvCategory === 'Paling') {
      category = 'paling';
    } else if (csvCategory === 'Sleeper') {
      category = 'sleeper';
    } else if (csvCategory === 'Nails' || csvCategory === 'Screw') {
      category = 'screw';
    } else if (csvCategory === 'Bagged Concrete') {
      category = 'fixing';
    } else if (csvCategory === 'Infill Sheet') {
      category = 'sheet';
    } else if (csvCategory === 'Post Cap' || csvCategory === 'Coloured Cap') {
      category = 'cap';
    } else if (csvCategory === 'Gate' || csvCategory === 'Gate Style' || csvCategory === 'Double gate' || csvCategory === 'Single gate') {
      category = 'gate';
    } else if (csvCategory === 'Hinge Accessory' || csvCategory === 'Latch Accessory' || csvCategory === 'Gate Accessory') {
      category = 'hardware';
    }

    // Map unit
    let unit = 'each';
    if (category === 'fixing' && name.toLowerCase().includes('concrete')) {
      unit = 'bag';
    } else if (category === 'screw' && (name.toLowerCase().includes('nail') || name.toLowerCase().includes('screw'))) {
      unit = 'pack';
    } else if (category === 'rail' || category === 'sleeper') {
      unit = 'length';
    }

    const defaultPrice = row.tier2_ex_gst ? parseFloat(row.tier2_ex_gst) : 'NULL';
    
    // Build metadata
    const metadata = {
      length_mm: row.length_mm ? parseInt(row.length_mm) : null,
      size: row.size ? row.size.trim() : null,
      colour: row.colour ? row.colour.trim() : null,
      brand: row.brand ? row.brand.trim() : null,
      style: row.style ? row.style.trim() : null,
    };

    // Clean up nulls
    Object.keys(metadata).forEach(key => metadata[key] === null && delete metadata[key]);

    const escapedName = name.replace(/'/g, "''");
    const escapedDesc = desc.replace(/'/g, "''");

    valuesSqls.push(`  ((SELECT id FROM af_org), '${sku}', '${escapedName}', '${escapedDesc}', '${category}', '${unit}', ${defaultPrice}, ${systemTypes}, true, '${JSON.stringify(metadata)}'::jsonb)`);
  }

  sql += valuesSqls.join(',\n') + '\nON CONFLICT (org_id, sku) DO UPDATE SET\n  name = EXCLUDED.name,\n  description = EXCLUDED.description,\n  category = EXCLUDED.category,\n  unit = EXCLUDED.unit,\n  default_price = EXCLUDED.default_price,\n  system_types = EXCLUDED.system_types,\n  metadata = EXCLUDED.metadata;\n';

  writeFileSync('scratch/missing_components.sql', sql);
  console.log(`Generated scratch/missing_components.sql with ${missingRows.length} rows.`);
}

main().catch(console.error);
