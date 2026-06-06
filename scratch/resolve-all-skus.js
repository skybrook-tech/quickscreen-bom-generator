import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');
const csvData = Papa.parse(csvContent, { header: true, skipEmptyLines: true }).data;

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

// Let's create a map of description -> SKU and name -> SKU
const descToSku = new Map();
const nameToSku = new Map();

for (const pc of pcList) {
  if (pc.sku) {
    descToSku.set(pc.description.trim().toLowerCase(), pc.sku);
    nameToSku.set(pc.name.trim().toLowerCase(), pc.sku);
  }
}

let resolved = 0;
let total = csvData.length;

const resolvedRows = [];

for (const row of csvData) {
  let sku = row.supplier_sku?.trim();
  if (sku) {
    resolvedRows.push({ ...row, sku });
    resolved++;
    continue;
  }
  
  const desc = row.description?.trim().toLowerCase();
  const name = row.canonical_name?.trim().toLowerCase();
  
  let catalogSku = descToSku.get(desc) || nameToSku.get(name);
  if (catalogSku) {
    resolvedRows.push({ ...row, sku: catalogSku });
    resolved++;
  } else if (row.canonical_name === '100x100 Treated Pine Post 3000mm') {
    resolvedRows.push({ ...row, sku: 'AF-POST-PINE-100x100-3000' });
    resolved++;
  } else {
    console.log("Still unmatched:", row.canonical_name, "|", row.description);
  }
}

console.log(`Resolved: ${resolved} / ${total}`);
