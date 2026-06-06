import { readFileSync } from 'node:fs';

const jsonPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/seeds/amazing-fencing/products/price_catalogue.json';
const catalog = JSON.parse(readFileSync(jsonPath, 'utf8'));
const pcList = catalog.product_components;

const matches = pcList.filter(pc => pc.name?.toLowerCase().includes('hardwood') && pc.name?.toLowerCase().includes('post'));
console.log("Matches in catalog:", matches.map(m => ({ sku: m.sku, name: m.name, desc: m.description, default_price: m.default_price })));
