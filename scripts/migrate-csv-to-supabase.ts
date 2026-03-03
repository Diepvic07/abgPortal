/**
 * CSV → Supabase Migration Script
 * Imports ~500 members from ABG_Portal CSV into the members table.
 *
 * Usage:
 *   npm run migrate:csv:dry   # Preview without writing
 *   npm run migrate:csv       # Actual import
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH = '/Users/diep/Documents/Outsourcing/ABG/ABG_Portal/data/members.csv';
const HEADER_MAP_PATH = '/Users/diep/Documents/Outsourcing/ABG/ABG_Portal/data/header_map.json';
const BATCH_SIZE = 50;
const DRY_RUN = process.argv.includes('--dry-run');

// ── Supabase ─────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase client only needed for actual (non-dry) runs
const supabase = (!DRY_RUN && supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Validation ────────────────────────────────────────────────────────────────

const MemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// No boolean columns from CSV currently, add parseBool helper here if needed

function orNull(val: string | undefined): string | null {
  return val?.trim() || null;
}

// ── Map row → member ──────────────────────────────────────────────────────────

function mapRowToMember(row: Record<string, string>) {
  const email = row['email']?.trim().toLowerCase();
  const name = row['full_name']?.trim() || '';
  const id = uuidv4();

  return {
    id,
    name,
    email,
    role: orNull(row['role']),
    company: orNull(row['company']),
    expertise: orNull(row['company_industry']),
    can_help_with: orNull(row['sharing_topics']),
    looking_for: orNull(row['learning_topics']),
    bio: orNull(row['extra_bio']),
    avatar_url: orNull(row['avatar_url']),
    phone: orNull(row['phone']),
    facebook_url: orNull(row['facebook_link']),
    linkedin_url: orNull(row['linkedin_link']),
    company_website: orNull(row['company_link']),
    country: orNull(row['country']) ?? 'Việt Nam',
    abg_class: orNull(row['class']),
    // Defaults for CSV imports
    status: 'active' as const,
    account_status: 'active' as const,
    approval_status: 'approved' as const,
    paid: false,
    is_csv_imported: true,
    auth_provider: 'magic_link',
    free_requests_used: 0,
    total_requests_count: 0,
    requests_today: 0,
    payment_status: 'unpaid' as const,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('='.repeat(60));
  console.log(DRY_RUN ? 'DRY RUN — no data will be written' : 'MIGRATING CSV → SUPABASE');
  console.log('='.repeat(60));

  // Load header map
  const headerMap: { vietnamese_to_snake: Record<string, string> } =
    JSON.parse(fs.readFileSync(HEADER_MAP_PATH, 'utf-8'));
  const viToEn = headerMap.vietnamese_to_snake;

  // Parse CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[ERROR] CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const rawCsv = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: Record<string, string>[] = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  console.log(`Parsed ${records.length} rows from CSV\n`);

  // Remap Vietnamese headers → snake_case
  const rows = records.map(record => {
    const mapped: Record<string, string> = {};
    for (const [key, val] of Object.entries(record)) {
      const snakeKey = viToEn[key] ?? key;
      mapped[snakeKey] = val;
    }
    return mapped;
  });

  // Validate Supabase credentials for actual run
  if (!DRY_RUN && !supabase) {
    console.error('[ERROR] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  // Fetch existing emails from Supabase for duplicate check
  let existingEmails = new Set<string>();
  if (!DRY_RUN && supabase) {
    const { data, error } = await supabase.from('members').select('email');
    if (error) {
      console.error('[ERROR] Failed to fetch existing emails:', error.message);
      process.exit(1);
    }
    existingEmails = new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
    console.log(`Found ${existingEmails.size} existing members in Supabase\n`);
  }

  // Process rows
  let total = 0, inserted = 0, skipped = 0, errors = 0;
  const batch: ReturnType<typeof mapRowToMember>[] = [];

  const flushBatch = async () => {
    if (batch.length === 0 || !supabase) return;
    const { error } = await supabase
      .from('members')
      .upsert(batch, { onConflict: 'email' });
    if (error) {
      console.error(`[ERROR] Batch insert failed: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
    batch.length = 0;
  };

  for (const row of rows) {
    total++;
    const email = row['email']?.trim().toLowerCase();
    const name = row['full_name']?.trim();

    if (!email) {
      console.log(`[SKIP] No email — row ${total} (${name || 'unnamed'})`);
      skipped++;
      continue;
    }

    const member = mapRowToMember(row);

    // Zod validation
    const validation = MemberSchema.safeParse(member);
    if (!validation.success) {
      console.log(`[SKIP] Validation failed — ${email}: ${validation.error.issues[0].message}`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY] Would insert: ${email} (${name})`);
      inserted++;
      continue;
    }

    // Duplicate check
    if (existingEmails.has(email)) {
      console.log(`[SKIP] Already exists: ${email}`);
      skipped++;
      continue;
    }

    batch.push(member);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
      console.log(`[PROGRESS] Processed ${total}/${rows.length} rows — inserted ${inserted}, skipped ${skipped}, errors ${errors}`);
    }
  }

  // Flush remaining
  if (!DRY_RUN) await flushBatch();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total rows:  ${total}`);
  console.log(`Inserted:    ${inserted}`);
  console.log(`Skipped:     ${skipped}`);
  console.log(`Errors:      ${errors}`);
  if (DRY_RUN) console.log('\nDry run complete. Run without --dry-run to apply.');
}

migrate().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
