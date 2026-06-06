import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  if (content.toLowerCase().includes('product_components') && content.toLowerCase().includes('product_id')) {
    console.log(`Found mention in: ${file}`);
    
    // Print lines containing product_components or product_id
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes('product_components') || line.toLowerCase().includes('product_id')) {
        if (i < 50 || file.includes('033')) { // restrict output
          console.log(`  L${i+1}: ${line.trim()}`);
        }
      }
    });
  }
}
