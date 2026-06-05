import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');
const csvData = Papa.parse(csvContent, { header: true, skipEmptyLines: true }).data;

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

console.log(`CSV rows: ${csvData.length}, Catalog components: ${pcList.length}`);

// Let's create a map of description -> SKU from catalog
const descToSku = new Map();
const nameToSku = new Map();

for (const pc of pcList) {
  if (pc.sku) {
    if (pc.description) descToSku.set(pc.description.trim().toLowerCase(), pc.sku);
    if (pc.name) nameToSku.set(pc.name.trim().toLowerCase(), pc.sku);
  }
}

let matched = 0;
let unmatched = 0;
const unmatchedRows = [];

for (const row of csvData) {
  const csvSku = row.supplier_sku?.trim();
  if (csvSku) {
    matched++;
    continue;
  }
  // Blank SKU, try to find in catalog by description
  const desc = row.description?.trim().toLowerCase();
  const name = row.canonical_name?.trim().toLowerCase();
  
  let catalogSku = descToSku.get(desc) || nameToSku.get(name);
  if (catalogSku) {
    row.supplier_sku = catalogSku;
    matched++;
  } else {
    unmatched++;
    unmatchedRows.push(row);
  }
}

console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
if (unmatched > 0) {
  console.log("First 5 unmatched:");
  console.log(unmatchedRows.slice(0, 5).map(r => ({ canonical_name: r.canonical_name, description: r.description })));
}
