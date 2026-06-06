import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';

dotenv.config({ path: '.env.local', override: true });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const orgSlug = 'amazing-fencing';
  const { data: org } = await supabase.from('organisations').select('id').eq('slug', orgSlug).single();
  const orgId = org.id;

  const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
  const csvContent = readFileSync(csvPath, 'utf8');
  const csvData = Papa.parse(csvContent, { header: true, skipEmptyLines: true }).data;

  const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
  const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const pcList = catalog.product_components;

  const descToSku = new Map();
  const nameToSku = new Map();
  const pcMap = new Map();

  for (const pc of pcList) {
    if (pc.sku) {
      descToSku.set(pc.description.trim().toLowerCase(), pc.sku);
      nameToSku.set(pc.name.trim().toLowerCase(), pc.sku);
      pcMap.set(pc.sku, pc);
    }
  }

  // Load existing components in DB
  const { data: dbComps, error } = await supabase
    .from('product_components')
    .select('sku')
    .eq('org_id', orgId);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const dbSkuSet = new Set(dbComps.map(c => c.sku));
  const resolvedItems = [];

  for (const row of csvData) {
    let sku = row.supplier_sku?.trim();
    if (!sku) {
      const desc = row.description?.trim().toLowerCase();
      const name = row.canonical_name?.trim().toLowerCase();
      let catalogSku = descToSku.get(desc) || nameToSku.get(name);
      if (catalogSku) {
        sku = catalogSku;
      } else if (row.canonical_name === '100x100 Treated Pine Post 3000mm') {
        sku = 'AF-POST-PINE-100x100-3000';
      }
    }
    resolvedItems.push({ ...row, sku });
  }

  const missingFromDb = [];
  const seenMissingSku = new Set();

  for (const item of resolvedItems) {
    if (!dbSkuSet.has(item.sku)) {
      if (!seenMissingSku.has(item.sku)) {
        seenMissingSku.add(item.sku);
        missingFromDb.push(item);
      }
    }
  }

  console.log(`Resolved CSV items: ${resolvedItems.length}`);
  console.log(`Components missing from DB: ${missingFromDb.length}`);

  // Let's generate the INSERT statements for the missing components
  let sql = `-- Add missing product components for Amazing Fencing (Brief 047)\n`;
  sql += `WITH af_org AS (SELECT id FROM organisations WHERE slug = 'amazing-fencing')\n`;
  sql += `INSERT INTO product_components (org_id, sku, name, description, category, unit, default_price, system_types, active, metadata, canonical_code)\nVALUES\n`;

  const valuesSqls = [];
  for (const row of missingFromDb) {
    const sku = row.sku;
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
    
    // Build metadata from catalog if possible, otherwise use CSV values
    const catalogItem = pcMap.get(sku);
    let metadata = {};
    if (catalogItem && catalogItem.metadata) {
      metadata = {
        ...catalogItem.metadata,
        length_mm: row.length_mm ? parseInt(row.length_mm) : catalogItem.metadata.length_mm || null,
        size: row.size ? row.size.trim() : catalogItem.metadata.size || null,
        colour: row.colour ? row.colour.trim() : catalogItem.metadata.colour || null,
        brand: row.brand ? row.brand.trim() : catalogItem.metadata.brand || null,
        style: row.style ? row.style.trim() : catalogItem.metadata.style || null,
      };
    } else {
      metadata = {
        length_mm: row.length_mm ? parseInt(row.length_mm) : null,
        size: row.size ? row.size.trim() : null,
        colour: row.colour ? row.colour.trim() : null,
        brand: row.brand ? row.brand.trim() : null,
        style: row.style ? row.style.trim() : null,
      };
    }

    // Clean up nulls
    Object.keys(metadata).forEach(key => metadata[key] === null && delete metadata[key]);

    const escapedName = name.replace(/'/g, "''");
    const escapedDesc = desc.replace(/'/g, "''");
    const canonicalCode = name; // set canonical_code to canonical_name

    valuesSqls.push(`  ((SELECT id FROM af_org), '${sku}', '${escapedName}', '${escapedDesc}', '${category}', '${unit}', ${defaultPrice}, ${systemTypes}, true, '${JSON.stringify(metadata)}'::jsonb, '${canonicalCode.replace(/'/g, "''")}')`);
  }

  sql += valuesSqls.join(',\n') + '\nON CONFLICT (org_id, sku) DO UPDATE SET\n  name = EXCLUDED.name,\n  description = EXCLUDED.description,\n  category = EXCLUDED.category,\n  unit = EXCLUDED.unit,\n  default_price = EXCLUDED.default_price,\n  system_types = EXCLUDED.system_types,\n  metadata = EXCLUDED.metadata,\n  canonical_code = EXCLUDED.canonical_code;\n';

  writeFileSync('scratch/resolved_missing_components.sql', sql);
  console.log(`Generated scratch/resolved_missing_components.sql with ${missingFromDb.length} rows.`);
}

main().catch(console.error);
