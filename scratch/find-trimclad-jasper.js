import { readFileSync } from 'node:fs';

const csvPath = 'c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/_briefs/amazing-fencing-handoff/seed-data/brief_047_seed_timber_colorbond.csv';
const lines = readFileSync(csvPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('JASPER') && lines[i].includes('1790')) {
    console.log(`Line ${i + 1}: ${lines[i]}`);
  }
}
