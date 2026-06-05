import { readFileSync } from 'node:fs';

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

const matches = pcList.filter(pc => pc.name?.toLowerCase().includes('100x100') && pc.name?.toLowerCase().includes('post') && pc.name?.toLowerCase().includes('3000'));
console.log("Matches in catalog:", matches);
