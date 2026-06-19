import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(__dirname, { recursive: true })
  .filter(f => f.endsWith('.test.ts'))
  .sort();

for (const file of files) {
  await import(pathToFileURL(join(__dirname, file)).href);
}
