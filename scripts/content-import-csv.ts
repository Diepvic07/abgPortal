/**
 * Import edited CSV back into Vietnamese translation file (vi.ts).
 * Reads: scripts/content/vi-content-export.csv (edited by content team)
 * Writes: lib/i18n/translations/vi.ts
 *
 * Usage: npx tsx scripts/content-import-csv.ts
 *        npx tsx scripts/content-import-csv.ts --dry-run  (preview changes only)
 */

import * as fs from 'fs';
import * as path from 'path';
import { en } from '../lib/i18n/translations/en';

const CSV_PATH = path.join(__dirname, 'content', 'vi-content-export.csv');
const VI_OUTPUT = path.join(
  __dirname,
  '..',
  'lib',
  'i18n',
  'translations',
  'vi.ts'
);

// Parse CSV line handling quoted fields with commas and escaped quotes
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Set value in nested object by dot-notation key
function setByPath(
  obj: Record<string, unknown>,
  keyPath: string,
  value: string
): void {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

// Get value from nested object by dot-notation key
function getByPath(obj: Record<string, unknown>, keyPath: string): string {
  const parts = keyPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  return String(current);
}

// Render nested object as TypeScript source with proper indentation
function renderTS(obj: unknown, indent = 2): string {
  if (typeof obj === 'string') {
    // Use single quotes, escape single quotes inside
    const escaped = obj.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }

  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) return '{}';

  const pad = ' '.repeat(indent);
  const lines = entries.map(([key, val]) => {
    // Quote keys with hyphens
    const safeKey = key.includes('-') ? `'${key}'` : key;
    return `${pad}${safeKey}: ${renderTS(val, indent + 2)},`;
  });

  const outerPad = ' '.repeat(indent - 2);
  return `{\n${lines.join('\n')}\n${outerPad}}`;
}

function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    console.error('Run content-export-csv.ts first to generate the CSV.');
    process.exit(1);
  }

  // Read CSV
  let content = fs.readFileSync(CSV_PATH, 'utf-8');
  // Strip BOM
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

  const lines = content.split('\n').filter((l) => l.trim());
  // Skip header row
  const dataLines = lines.slice(1);

  // Build translation object from CSV
  const viObj: Record<string, unknown> = {};
  let imported = 0;
  let changed = 0;

  // Also read current vi.ts for diff comparison
  const { vi: currentVi } = require('../lib/i18n/translations/vi');

  for (const line of dataLines) {
    // Skip separator rows
    if (line.startsWith('"---') || line.startsWith('---')) continue;

    const fields = parseCSVLine(line);
    // Columns: Page, Description, Key, English, Current Vietnamese, New Vietnamese
    if (fields.length < 6) continue;

    const key = fields[2].trim();
    const newViValue = fields[5].trim();

    if (!key || !newViValue) continue;

    setByPath(viObj, key, newViValue);
    imported++;

    // Check if changed
    const oldValue = getByPath(
      currentVi as unknown as Record<string, unknown>,
      key
    );
    if (oldValue !== newViValue) {
      changed++;
      if (isDryRun) {
        console.log(`\n  CHANGED: ${key}`);
        console.log(`    Old: ${oldValue}`);
        console.log(`    New: ${newViValue}`);
      }
    }
  }

  console.log(`\nParsed ${imported} translations, ${changed} changed.`);

  if (isDryRun) {
    console.log('\n[DRY RUN] No files written. Remove --dry-run to apply.');
    return;
  }

  if (changed === 0) {
    console.log('No changes detected. Skipping write.');
    return;
  }

  // Generate vi.ts content
  const tsContent = [
    "// Vietnamese translations for ABG Alumni Connect",
    "import type { Translations } from './en';",
    '',
    `export const vi: Translations = ${renderTS(viObj)} as const;`,
    '',
  ].join('\n');

  // Backup current file
  const backupPath = VI_OUTPUT + '.backup';
  if (fs.existsSync(VI_OUTPUT)) {
    fs.copyFileSync(VI_OUTPUT, backupPath);
    console.log(`Backup saved: ${backupPath}`);
  }

  fs.writeFileSync(VI_OUTPUT, tsContent, 'utf-8');
  console.log(`Updated: ${VI_OUTPUT}`);
  console.log(`${changed} translations changed.`);
}

main();
