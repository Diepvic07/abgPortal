/**
 * Live Data Migration Script
 * Migrates ~442 ABG members from CSV to Google Sheets, clearing all test data.
 * All members start as Basic tier (paid=FALSE); admin marks Premium manually.
 *
 * Usage: npm run migrate-live
 */

import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

// Validate environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.error('Missing required environment variables:');
  if (!SPREADSHEET_ID) console.error('  - GOOGLE_SHEETS_ID');
  if (!SERVICE_ACCOUNT_EMAIL) console.error('  - GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!PRIVATE_KEY) console.error('  - GOOGLE_PRIVATE_KEY');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: SERVICE_ACCOUNT_EMAIL,
    private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Sheet names matching lib/google-sheets.ts
const SHEETS = {
  MEMBERS: 'Members',
  REQUESTS: 'Requests',
  CONNECTIONS: 'Connections',
  DATING_PROFILES: 'DatingProfiles',
  AUDIT: 'RequestAudit',
} as const;

// 42-column headers (A:AP) matching lib/google-sheets.ts getMembers mapping
const MEMBER_HEADERS = [
  'id', 'name', 'email', 'role', 'company', 'expertise', 'can_help_with',
  'looking_for', 'bio', 'avatar_url', 'voice_url', 'status', 'paid',
  'free_requests_used', 'created_at', 'phone', 'facebook_url', 'linkedin_url',
  'company_website', 'country', 'open_to_work', 'job_preferences', 'hiring',
  'hiring_preferences', 'gender', 'relationship_status', 'auth_provider',
  'auth_provider_id', 'last_login', 'account_status', 'total_requests_count',
  'requests_today', 'abg_class', 'nickname', 'display_nickname_in_search',
  'display_nickname_in_match', 'display_nickname_in_email', 'discord_username',
  'payment_status', 'membership_expiry', 'approval_status', 'is_csv_imported'
];

// RFC 4180 CSV Parser (from seed-csv-data.ts)
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuote) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuote = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r' || char === '\n') {
        if (current.length > 0 || row.length > 0) {
          row.push(current);
          result.push(row);
          row = [];
          current = '';
        }
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        current += char;
      }
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    result.push(row);
  }
  return result;
}

// Clear all data rows from a sheet (preserve header row)
async function clearSheet(sheetName: string): Promise<void> {
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:AP`, // Clear rows 2+ (preserve header)
    });
    console.log(`  ✓ Cleared ${sheetName}`);
  } catch (error) {
    // Sheet might not exist - that's okay
    console.log(`  - ${sheetName} (skipped - may not exist)`);
  }
}

// Clear all 5 sheets before import
async function clearAllSheets(): Promise<void> {
  console.log('Clearing all sheets...');
  await clearSheet(SHEETS.MEMBERS);
  await clearSheet(SHEETS.REQUESTS);
  await clearSheet(SHEETS.CONNECTIONS);
  await clearSheet(SHEETS.DATING_PROFILES);
  await clearSheet(SHEETS.AUDIT);
  console.log('All sheets cleared.\n');
}

// Update Members sheet headers to 42 columns
async function updateMemberHeaders(): Promise<void> {
  console.log('Updating Members headers...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Members!A1:AP1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [MEMBER_HEADERS],
    },
  });
  console.log('  ✓ Headers updated (42 columns)\n');
}

// Parse CSV and map to 42-column format
function parseCsvMembers(csvPath: string): string[][] {
  console.log('Parsing CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const parsed = parseCSV(csvContent);

  // Skip header row
  const dataRows = parsed.slice(1);
  console.log(`  Found ${dataRows.length} rows in CSV`);

  // CSV column mapping (based on abg_members_portal_data.csv inspection):
  // 0: Submission ID -> id
  // 1: Respondent ID
  // 2: Submitted at -> created_at
  // 3: Họ và tên -> name
  // 4: Học viên khoá ABG? -> abg_class
  // 5: Email -> email
  // 6: Avatar URL -> avatar_url
  // 7: City
  // 8: Contact Preference
  // 9: Phone
  // 10: Facebook
  // 11: LinkedIn
  // 12: Organization -> company
  // 13: Organization Website
  // 14: Organization Field -> expertise
  // 15: Position -> role
  // 16: 3 things to share -> can_help_with
  // 17: 3 things to learn -> looking_for
  // 18: Bio -> bio
  // 19: Country

  const members = dataRows.map((row) => {
    const get = (idx: number) => row[idx] || '';

    return [
      get(0),       // id (Submission ID)
      get(3),       // name
      get(5),       // email
      get(15),      // role
      get(12),      // company
      get(14),      // expertise
      get(16),      // can_help_with
      get(17),      // looking_for
      get(18),      // bio
      get(6),       // avatar_url
      '',           // voice_url
      'active',     // status
      'FALSE',      // paid (Basic tier)
      '0',          // free_requests_used
      get(2),       // created_at
      get(9),       // phone
      get(10),      // facebook_url
      get(11),      // linkedin_url
      get(13),      // company_website
      get(19),      // country
      '',           // open_to_work
      '',           // job_preferences
      '',           // hiring
      '',           // hiring_preferences
      '',           // gender
      '',           // relationship_status
      '',           // auth_provider
      '',           // auth_provider_id
      '',           // last_login
      'active',     // account_status
      '0',          // total_requests_count
      '0',          // requests_today
      get(4),       // abg_class (ABG cohort)
      '',           // nickname
      '',           // display_nickname_in_search
      '',           // display_nickname_in_match
      '',           // display_nickname_in_email
      '',           // discord_username
      'unpaid',     // payment_status
      '',           // membership_expiry
      'approved',   // approval_status
      'TRUE',       // is_csv_imported
    ];
  });

  console.log(`  ✓ Parsed ${members.length} members\n`);
  return members;
}

// Create admin member (Premium tier)
function createAdminMember(): string[] {
  return [
    'diep_admin',           // id
    'Diep Vic',             // name
    'diepvic@gmail.com',    // email
    'Admin',                // role
    'ABG',                  // company
    'Everything',           // expertise
    'Everything',           // can_help_with
    'Nothing',              // looking_for
    'Premium Admin',        // bio
    '',                     // avatar_url
    '',                     // voice_url
    'active',               // status
    'TRUE',                 // paid (Premium tier)
    '0',                    // free_requests_used
    new Date().toISOString(), // created_at
    '',                     // phone
    '',                     // facebook_url
    '',                     // linkedin_url
    '',                     // company_website
    '',                     // country
    '',                     // open_to_work
    '',                     // job_preferences
    '',                     // hiring
    '',                     // hiring_preferences
    '',                     // gender
    '',                     // relationship_status
    '',                     // auth_provider
    '',                     // auth_provider_id
    '',                     // last_login
    'active',               // account_status
    '0',                    // total_requests_count
    '0',                    // requests_today
    '',                     // abg_class
    '',                     // nickname
    '',                     // display_nickname_in_search
    '',                     // display_nickname_in_match
    '',                     // display_nickname_in_email
    '',                     // discord_username
    'paid',                 // payment_status
    '',                     // membership_expiry
    'approved',             // approval_status
    'FALSE',                // is_csv_imported
  ];
}

// Batch insert members into Google Sheets
async function batchInsertMembers(members: string[][]): Promise<void> {
  console.log('Inserting members into Google Sheets...');

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Members!A:AP',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: members },
  });

  console.log(`  ✓ Inserted ${members.length} members\n`);
}

// Main orchestration
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('ABG Live Data Migration');
  console.log('='.repeat(50));
  console.log('');

  const csvPath = path.join(process.cwd(), 'docs', 'abg_members_portal_data.csv');

  // Verify CSV exists
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Step 1: Clear all sheets
  await clearAllSheets();

  // Step 2: Update headers
  await updateMemberHeaders();

  // Step 3: Parse CSV members
  const members = parseCsvMembers(csvPath);

  // Step 4: Add admin account
  console.log('Adding admin account...');
  members.push(createAdminMember());
  console.log('  ✓ Admin account added (diepvic@gmail.com)\n');

  // Step 5: Batch insert all members
  await batchInsertMembers(members);

  // Summary
  console.log('='.repeat(50));
  console.log('Migration Complete!');
  console.log('='.repeat(50));
  console.log(`Total members: ${members.length}`);
  console.log(`  - CSV members: ${members.length - 1} (Basic tier)`);
  console.log('  - Admin: 1 (Premium tier)');
  console.log('');
  console.log('All members have:');
  console.log('  - approval_status = approved');
  console.log('  - account_status = active');
  console.log('  - is_csv_imported = TRUE (except admin)');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify member count in Google Sheets');
  console.log('  2. Test login with a sample member email');
  console.log('  3. Mark premium members via admin panel');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
