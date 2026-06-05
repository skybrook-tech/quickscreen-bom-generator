import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
});

const matches = parsed.data.filter(row => parseFloat(row.tier2_ex_gst) === 82.92);
console.log(`Found ${matches.length} matches for price 82.92:`);
console.log(matches.map(m => ({
  system: m.system,
  category: m.category,
  canonical_name: m.canonical_name,
  supplier_sku: m.supplier_sku,
  description: m.description,
  price: m.tier2_ex_gst
})));
