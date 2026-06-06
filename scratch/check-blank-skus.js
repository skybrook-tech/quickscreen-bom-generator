import { readFileSync } from 'node:fs';
import Papa from 'papaparse';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const csvContent = readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
});

const blankSkus = parsed.data.filter(row => !row.supplier_sku || row.supplier_sku.trim() === '');
console.log(`Found ${blankSkus.length} rows with blank supplier_sku.`);
if (blankSkus.length > 0) {
  console.log("Rows with blank supplier_sku:", blankSkus.map(r => ({ name: r.canonical_name, category: r.category })));
}
