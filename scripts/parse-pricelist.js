import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const pricelistDir = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/Pricelist';
const outputFile = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/scratch/pricelist_summary.json';

async function main() {
  const files = fs.readdirSync(pricelistDir).filter(f => f.endsWith('.xlsx'));
  const allItems = [];
  const categories = new Set();
  const productTypes = new Set();
  const brands = new Set();
  const seasons = new Set();

  for (const file of files) {
    const filePath = path.join(pricelistDir, file);
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find header
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('code') || cell.toLowerCase().includes('sku') || cell.toLowerCase().includes('name')))) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) continue;
    
    const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
    const skuIdx = headers.findIndex(h => h.toLowerCase() === 'suppliersku');
    const descIdx = headers.findIndex(h => h.toLowerCase() === 'shortdescription');
    const priceIdx = headers.findIndex(h => h.toLowerCase() === 'buypriceex');
    const rrIdx = headers.findIndex(h => h.toLowerCase() === 'rrp');
    const posPriceIdx = headers.findIndex(h => h.toLowerCase() === 'posprice');
    const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'season'); // Season column contains categories in these exports
    const typeIdx = headers.findIndex(h => h.toLowerCase() === 'producttype');
    const brandIdx = headers.findIndex(h => h.toLowerCase() === 'brand');
    const colourIdx = headers.findIndex(h => h.toLowerCase() === 'colour');
    const sizeIdx = headers.findIndex(h => h.toLowerCase() === 'size');

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const sku = row[skuIdx] ? String(row[skuIdx]).trim() : '';
      const desc = row[descIdx] ? String(row[descIdx]).trim() : '';
      if (!sku || !desc) continue;
      
      const price = parseFloat(row[priceIdx]) || 0;
      const posPrice = parseFloat(row[posPriceIdx]) || 0;
      const rrp = parseFloat(row[rrIdx]) || 0;
      const category = row[categoryIdx] ? String(row[categoryIdx]).trim() : 'Other';
      const type = row[typeIdx] ? String(row[typeIdx]).trim() : '';
      const brand = row[brandIdx] ? String(row[brandIdx]).trim() : '';
      const colour = row[colourIdx] ? String(row[colourIdx]).trim() : '';
      const size = row[sizeIdx] ? String(row[sizeIdx]).trim() : '';

      categories.add(category);
      if (type) productTypes.add(type);
      if (brand) brands.add(brand);

      allItems.push({
        sku,
        description: desc,
        buyPriceEx: price,
        posPrice,
        rrp,
        category,
        productType: type,
        brand,
        colour,
        size,
        file
      });
    }
  }

  const result = {
    totalItems: allItems.length,
    uniqueCategories: Array.from(categories),
    uniqueProductTypes: Array.from(productTypes),
    uniqueBrands: Array.from(brands),
    sampleItems: allItems.slice(0, 10),
    itemsByCategory: Array.from(categories).reduce((acc, cat) => {
      acc[cat] = allItems.filter(item => item.category === cat).length;
      return acc;
    }, {})
  };

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(`Successfully parsed all files. Written summary to ${outputFile}`);
}

main().catch(console.error);
