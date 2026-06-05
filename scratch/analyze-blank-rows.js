import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
});

const blankSkus = parsed.data.filter(row => !row.supplier_sku || row.supplier_sku.trim() === '');
console.log(`Found ${blankSkus.length} blank SKU rows.`);
const sample = blankSkus.slice(0, 15);
console.log("Sample blank SKU rows:");
sample.forEach(r => {
  console.log(`- Name: "${r.canonical_name}", Desc: "${r.description}", Price: "${r.tier2_ex_gst}", Colour: "${r.colour}"`);
});
