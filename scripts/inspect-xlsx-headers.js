import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const pricelistDir = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/Pricelist';

async function main() {
  const files = fs.readdirSync(pricelistDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${files.length} Excel files in Pricelist directory.`);

  for (const file of files) {
    const filePath = path.join(pricelistDir, file);
    console.log(`\n========================================`);
    console.log(`File: ${file}`);
    const workbook = xlsx.readFile(filePath);
    
    // Print the first sheet rows
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the row index where headers are. Headers usually contain Code, Name, SKU, or similar.
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (row && row.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('code') || cell.toLowerCase().includes('sku') || cell.toLowerCase().includes('name')))) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex !== -1) {
      console.log(`Header found at row ${headerRowIndex}:`, JSON.stringify(data[headerRowIndex]));
      console.log('Sample Rows after header (first 3):');
      data.slice(headerRowIndex + 1, headerRowIndex + 4).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, JSON.stringify(row));
      });
    } else {
      console.log('No header matching "code", "sku" or "name" was found in first 20 rows.');
      console.log('First 10 rows:');
      data.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
      });
    }
  }
}

main().catch(console.error);
