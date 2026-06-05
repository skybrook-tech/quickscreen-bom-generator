import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');
const csvData = Papa.parse(csvContent, { header: true, skipEmptyLines: true }).data;

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

const descToSku = new Map();
const nameToSku = new Map();

for (const pc of pcList) {
  if (pc.sku) {
    descToSku.set(pc.description.trim().toLowerCase(), pc.sku);
    nameToSku.set(pc.name.trim().toLowerCase(), pc.sku);
  }
}

const resolvedSkus = new Map();

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
  
  if (resolvedSkus.has(sku)) {
    const existing = resolvedSkus.get(sku);
    existing.push(row);
  } else {
    resolvedSkus.set(sku, [row]);
  }
}

const duplicates = Array.from(resolvedSkus.entries()).filter(([sku, rows]) => rows.length > 1);
console.log(`Found ${duplicates.length} duplicate resolved SKUs.`);
if (duplicates.length > 0) {
  console.log("Duplicate SKUs and their rows:");
  duplicates.forEach(([sku, rows]) => {
    console.log(`- SKU: ${sku} (${rows.length} rows):`);
    rows.forEach(r => {
      console.log(`  Name: "${r.canonical_name}", Price: ${r.tier2_ex_gst}, Desc: "${r.description}"`);
    });
  });
}
