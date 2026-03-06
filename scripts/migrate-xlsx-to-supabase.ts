/**
 * XLSX → Supabase Migration Script
 * Imports ~500 members from multi-sheet XLSX into the members table.
 * Uses merge-upsert: fills empty fields only, never overwrites existing data.
 *
 * Usage:
 *   npm run migrate:xlsx:dry            # Preview without writing
 *   npm run migrate:xlsx                # Actual import
 *   npm run migrate:xlsx -- --file /path/to/file.xlsx
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ── Config ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');

const fileArgIdx = process.argv.findIndex(a => a === '--file');
const DEFAULT_FILE = path.resolve(__dirname, '../docs/Full_500_member_data.xlsx');
const XLSX_FILE = fileArgIdx !== -1 ? path.resolve(process.argv[fileArgIdx + 1]) : DEFAULT_FILE;

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (!DRY_RUN && supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Header Detection ──────────────────────────────────────────────────────────

const HEADER_PATTERNS: Record<string, string[]> = {
  name: ['Họ tên', 'Họ và tên', 'Full name', 'Tên đầy đủ', 'Ho ten', 'Họ và Tên', 'Tên'],
  email: ['Email', 'Địa chỉ email', 'Mail', 'E-mail', 'Emai liên lạc', 'Email của bạn'],
  phone: ['SĐT', 'Số điện thoại', 'Phone', 'SDT', 'Điện thoại', 'SĐT ', 'Số điện thoại liên lạc'],
  country: ['Tỉnh thành', 'Thành phố', 'Địa chỉ', 'Tỉnh/Thành', 'Nơi ở', 'Tỉnh thành ', 'Tỉnh/địa phương bạn sinh sống'],
  birth_year: ['Năm sinh', 'Ngày sinh', 'NS', 'Sinh năm'],
  facebook_url: ['Facebook cá nhân', 'Facebook', 'FB', 'Link Facebook'],
  notes: ['Ghi chú', 'Note', 'Notes'],
};

function detectHeaders(row: unknown[]): { map: Record<string, number>; unrecognized: string[] } {
  const map: Record<string, number> = {};
  const unrecognized: string[] = [];

  row.forEach((cell, idx) => {
    const cellStr = String(cell ?? '').trim();
    if (!cellStr) return;
    // Skip cells that look like actual data (email address, URL, phone number)
    if (cellStr.includes('@') || /^https?:\/\//.test(cellStr) || /^\d{7,}$/.test(cellStr.replace(/\s/g, ''))) return;
    // Strip leading numbered prefixes like "4. " or "12. "
    const normalized = cellStr.replace(/^\d+\.\s*/, '').trim().toLowerCase();

    let matched = false;
    for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
      // Bidirectional includes: pattern in cell OR cell in pattern (handles long Vietnamese headers)
      if (patterns.some(p => {
        const pl = p.trim().toLowerCase();
        return pl === normalized || normalized.includes(pl) || pl.includes(normalized);
      })) {
        if (!(field in map)) map[field] = idx;
        matched = true;
        break;
      }
    }
    if (!matched) unrecognized.push(cellStr);
  });

  return { map, unrecognized };
}

/** Try rows 0-2 to find header row. Returns best row index + detection result. */
function findHeaderRow(rows: unknown[][]): { headerIdx: number; map: Record<string, number>; unrecognized: string[] } | null {
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const result = detectHeaders(rows[i]);
    if ('email' in result.map && 'name' in result.map) return { headerIdx: i, ...result };
  }
  // Fallback: find email column by scanning first row for @ pattern
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const result = detectHeaders(rows[i]);
    if ('email' in result.map) return { headerIdx: i, ...result };
  }
  return null;
}

/** Detect headerless sheets by checking if row cells contain email-like values */
function detectHeaderlessLayout(rows: unknown[][]): { map: Record<string, number> } | null {
  const firstRow = rows[0];
  if (!firstRow) return null;
  const map: Record<string, number> = {};
  firstRow.forEach((cell, idx) => {
    const val = String(cell ?? '').trim();
    if (!val) return;
    if (val.includes('@') && !('email' in map)) map.email = idx;
    else if (/^(https?:\/\/)?(www\.)?facebook\.com/.test(val) && !('facebook_url' in map)) map.facebook_url = idx;
    else if (/^\d{9,11}$/.test(val.replace(/\s/g, '')) && !('phone' in map)) map.phone = idx;
    else if (/^(19|20)\d{2}$/.test(val) && !('birth_year' in map)) map.birth_year = idx;
  });
  // Assume first text column before email is name
  if ('email' in map) {
    for (let i = 0; i < map.email; i++) {
      const val = String(firstRow[i] ?? '').trim();
      if (val && !/^\d+$/.test(val) && !val.startsWith('ABG')) {
        map.name = i;
        break;
      }
    }
  }
  return ('email' in map && 'name' in map) ? { map } : null;
}

/** Check if a row is effectively empty */
function isEmptyRow(row: unknown[]): boolean {
  return row.every(cell => !String(cell ?? '').trim());
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizePhone(val: unknown): string | null {
  const str = String(val ?? '').trim();
  if (!str) return null;
  // Keep leading + for international, strip everything else non-digit
  const cleaned = str.replace(/(?!^\+)[^\d]/g, '');
  return cleaned || null;
}

function normalizeEmail(val: unknown): string | null {
  const str = String(val ?? '').trim().toLowerCase();
  return str || null;
}

function extractBirthYear(val: unknown): number | null {
  const str = String(val ?? '');
  const match = str.match(/\b(19[5-9]\d|200\d|201[0-9])\b/);
  return match ? parseInt(match[1], 10) : null;
}

function normalizeFacebookUrl(val: unknown): string | null {
  let str = String(val ?? '').trim();
  if (!str) return null;
  // Handle fb.com shorthand
  str = str.replace(/^fb\.com\//i, 'facebook.com/');
  if (!/^https?:\/\//i.test(str)) str = 'https://' + str;
  return str;
}

function orNull(val: unknown): string | null {
  const str = String(val ?? '').trim();
  return str || null;
}

// ── Validation ────────────────────────────────────────────────────────────────

const RowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExistingMember {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  birth_year: number | null;
  facebook_url: string | null;
  abg_class: string | null;
}

interface NewMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  birth_year: number | null;
  facebook_url: string | null;
  abg_class: string;
  status: 'active';
  account_status: 'active';
  approval_status: 'approved';
  paid: boolean;
  is_csv_imported: boolean;
  auth_provider: string;
  payment_status: 'unpaid';
  free_requests_used: number;
  total_requests_count: number;
  requests_today: number;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('='.repeat(60));
  console.log(DRY_RUN ? 'DRY RUN — no data will be written' : 'MIGRATING XLSX → SUPABASE');
  console.log(`File: ${XLSX_FILE}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(XLSX_FILE)) {
    console.error(`[ERROR] File not found: ${XLSX_FILE}`);
    process.exit(1);
  }

  if (!DRY_RUN && !supabase) {
    console.error('[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Load XLSX
  const workbook = XLSX.readFile(XLSX_FILE);

  // Fetch all existing members once
  const existingMap = new Map<string, ExistingMember>();
  if (!DRY_RUN && supabase) {
    const { data, error } = await supabase
      .from('members')
      .select('id, email, name, phone, country, birth_year, facebook_url, abg_class');
    if (error) {
      console.error('[ERROR] Failed to fetch existing members:', error.message);
      process.exit(1);
    }
    for (const m of (data ?? [])) {
      existingMap.set(m.email.toLowerCase(), m as ExistingMember);
    }
    console.log(`Found ${existingMap.size} existing members in Supabase\n`);
  }

  // Totals
  let totalInserted = 0, totalUpdated = 0, totalSkipped = 0, totalErrors = 0;
  let sheetsProcessed = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (rows.length < 2) {
      console.log(`[Sheet: "${sheetName}"] Empty or header-only — skipping`);
      continue;
    }

    sheetsProcessed++;
    const abgClass = sheetName.trim();

    // Try to find header row (rows 0-2), then try headerless detection
    const headerResult = findHeaderRow(rows);
    let headerMap: Record<string, number>;
    let dataStartIdx: number;
    let unrecognized: string[] = [];

    if (headerResult) {
      headerMap = headerResult.map;
      dataStartIdx = headerResult.headerIdx + 1;
      unrecognized = headerResult.unrecognized;
    } else {
      // Headerless sheet — detect columns by content type
      const headerless = detectHeaderlessLayout(rows);
      if (!headerless) {
        console.log(`\n[Sheet: "${sheetName}"] No headers or email column detected — skipping`);
        continue;
      }
      headerMap = headerless.map;
      dataStartIdx = 0; // data starts at row 0
      console.log(`\n[Sheet: "${sheetName}"] Headerless — auto-detected columns from data`);
    }

    // Header summary log
    const headerSummary = Object.entries(headerMap)
      .map(([f, i]) => `${f}(${XLSX.utils.encode_col(i)})`)
      .join(', ');
    const dataRows = rows.length - dataStartIdx;
    console.log(`${headerResult ? '\n' : ''}[Sheet: "${sheetName}"] Processing ${dataRows} rows...`);
    console.log(`  Headers: ${headerSummary || 'none detected'}`);
    if (unrecognized.length) console.log(`  Unrecognized: ${unrecognized.join(', ')}`);

    let sheetInserted = 0, sheetUpdated = 0, sheetSkipped = 0, sheetErrors = 0;
    const insertBatch: NewMember[] = [];

    const flushBatch = async () => {
      if (!insertBatch.length || !supabase) return;
      const { error } = await supabase.from('members').insert(insertBatch);
      if (error) {
        // Fallback: insert one by one to handle individual duplicates
        for (const member of insertBatch) {
          const { error: e2 } = await supabase.from('members').insert(member);
          if (e2) {
            if (e2.message.includes('duplicate key')) {
              sheetSkipped++; totalSkipped++; // already exists from earlier sheet
            } else {
              console.error(`  [ERROR] Insert failed for ${member.email}: ${e2.message}`);
              sheetErrors++; totalErrors++;
            }
          } else {
            sheetInserted++; totalInserted++;
            existingMap.set(member.email, member as unknown as ExistingMember);
          }
        }
      } else {
        sheetInserted += insertBatch.length;
        totalInserted += insertBatch.length;
        // Track newly inserted members for cross-sheet dedup
        for (const m of insertBatch) existingMap.set(m.email, m as unknown as ExistingMember);
      }
      insertBatch.length = 0;
    };

    for (let r = dataStartIdx; r < rows.length; r++) {
      const row = rows[r];
      if (isEmptyRow(row)) continue; // skip empty rows
      const rawEmail = normalizeEmail(row[headerMap.email]);
      const rawName = orNull(row[headerMap.name]);

      if (!rawEmail) {
        sheetSkipped++;
        totalSkipped++;
        continue;
      }

      const validation = RowSchema.safeParse({ name: rawName ?? '', email: rawEmail });
      if (!validation.success) {
        sheetSkipped++;
        totalSkipped++;
        continue;
      }

      const phone = 'phone' in headerMap ? normalizePhone(row[headerMap.phone]) : null;
      const country = 'country' in headerMap ? orNull(row[headerMap.country]) : null;
      const birthYear = 'birth_year' in headerMap ? extractBirthYear(row[headerMap.birth_year]) : null;
      const facebookUrl = 'facebook_url' in headerMap ? normalizeFacebookUrl(row[headerMap.facebook_url]) : null;
      const existing = existingMap.get(rawEmail);

      if (DRY_RUN) {
        if (!existing) {
          sheetInserted++;
          totalInserted++;
        } else {
          // Check if there's anything to merge
          const hasUpdate = (phone && !existing.phone) || (country && !existing.country) ||
            (birthYear && !existing.birth_year) || (facebookUrl && !existing.facebook_url) ||
            (abgClass && !existing.abg_class);
          if (hasUpdate) {
            sheetUpdated++;
            totalUpdated++;
          } else {
            sheetSkipped++;
            totalSkipped++;
          }
        }
        continue;
      }

      if (!existing) {
        // New member → INSERT
        insertBatch.push({
          id: uuidv4(),
          name: rawName!,
          email: rawEmail,
          phone,
          country,
          birth_year: birthYear,
          facebook_url: facebookUrl,
          abg_class: abgClass,
          status: 'active',
          account_status: 'active',
          approval_status: 'approved',
          paid: false,
          is_csv_imported: true,
          auth_provider: 'magic_link',
          payment_status: 'unpaid',
          free_requests_used: 0,
          total_requests_count: 0,
          requests_today: 0,
        });
        if (insertBatch.length >= BATCH_SIZE) await flushBatch();
      } else {
        // Existing member → merge-update (fill nulls only)
        const update: Record<string, unknown> = {};
        if (phone && !existing.phone) update.phone = phone;
        if (country && !existing.country) update.country = country;
        if (birthYear && !existing.birth_year) update.birth_year = birthYear;
        if (facebookUrl && !existing.facebook_url) update.facebook_url = facebookUrl;
        if (abgClass && !existing.abg_class) update.abg_class = abgClass;

        if (!Object.keys(update).length) {
          sheetSkipped++;
          totalSkipped++;
          continue;
        }

        if (supabase) {
          const { error } = await supabase
            .from('members')
            .update(update)
            .eq('id', existing.id);
          if (error) {
            console.error(`  [ERROR] Update failed for ${rawEmail}: ${error.message}`);
            sheetErrors++;
            totalErrors++;
          } else {
            sheetUpdated++;
            totalUpdated++;
          }
        }
      }
    }

    if (!DRY_RUN) await flushBatch();

    console.log(`  → ${sheetInserted} inserted | ${sheetUpdated} updated | ${sheetSkipped} skipped | ${sheetErrors} errors`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('=== FINAL SUMMARY ===');
  console.log('='.repeat(60));
  console.log(`Sheets:   ${sheetsProcessed} processed`);
  console.log(`Inserted: ${totalInserted}`);
  console.log(`Updated:  ${totalUpdated}`);
  console.log(`Skipped:  ${totalSkipped}`);
  console.log(`Errors:   ${totalErrors}`);
  console.log(`DRY RUN:  ${DRY_RUN}`);
  if (DRY_RUN) console.log('\nDry run complete. Run without --dry-run to apply.');
}

migrate().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
