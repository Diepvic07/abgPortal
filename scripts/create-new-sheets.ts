/**
 * Creates new Google Sheets tabs required by PRD features:
 * - LoveMatchRequests (10 columns)
 * - News (12 columns)
 * - Adds missing Member columns (requests_this_month, month_reset_date) if needed
 *
 * Usage: npx tsx scripts/create-new-sheets.ts
 * Requires .env.local with Google Sheets credentials
 */

import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

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

const NEW_TABS = [
  { title: 'LoveMatchRequests', headers: ['id', 'request_id', 'from_id', 'to_id', 'status', 'from_profile_shared', 'to_profile_shared', 'viewed_at', 'resolved_at', 'created_at'] },
  { title: 'News', headers: ['id', 'title', 'slug', 'category', 'excerpt', 'content', 'image_url', 'author_name', 'published_date', 'is_published', 'is_featured', 'created_at'] },
];

// Members columns at indices 53-54 (BB-BC)
const MEMBER_NEW_HEADERS = ['requests_this_month', 'month_reset_date'];
const MEMBER_NEW_COL_START = 'BB';

async function getExistingSheets(): Promise<string[]> {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID! });
  return (res.data.sheets || []).map(s => s.properties?.title || '');
}

async function createTab(title: string): Promise<void> {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID!,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

async function setHeaders(sheetName: string, headers: string[]): Promise<void> {
  const endCol = String.fromCharCode(64 + headers.length); // A=1 offset
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${sheetName}!A1:${endCol}1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });
}

async function addMemberColumns(): Promise<void> {
  // Check if header row already has these columns
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID!,
    range: 'Members!A1:BC1',
  });
  const existingHeaders = res.data.values?.[0] || [];

  if (existingHeaders.includes('requests_this_month')) {
    console.log('  Members columns already exist, skipping');
    return;
  }

  // Write new headers at BB1:BC1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: `Members!${MEMBER_NEW_COL_START}1:BC1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [MEMBER_NEW_HEADERS] },
  });
  console.log('  Added Members columns: requests_this_month (BB), month_reset_date (BC)');
}

async function main() {
  console.log(`Spreadsheet: ${SPREADSHEET_ID}\n`);

  const existing = await getExistingSheets();
  console.log(`Existing tabs: ${existing.join(', ')}\n`);

  // Create new tabs
  for (const tab of NEW_TABS) {
    if (existing.includes(tab.title)) {
      console.log(`[SKIP] "${tab.title}" already exists`);
      continue;
    }
    console.log(`[CREATE] "${tab.title}" (${tab.headers.length} columns)`);
    await createTab(tab.title);
    await setHeaders(tab.title, tab.headers);
    console.log(`  Headers: ${tab.headers.join(', ')}`);
  }

  // Add new Member columns
  console.log('\n[UPDATE] Members - adding monthly tracking columns');
  await addMemberColumns();

  console.log('\nDone! All sheets are ready.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
