/**
 * Migration script: DatingProfiles → Member columns
 *
 * Migrates dating profile data from the separate DatingProfiles sheet
 * into the new Member schema columns (AR-BA, indices 43-52).
 *
 * Usage:
 *   npm run migrate:dating:dry  # Test run, no changes
 *   npm run migrate:dating      # Actual migration
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

const SHEETS = {
  MEMBERS: 'Members',
  DATING_PROFILES: 'DatingProfiles',
};

interface DatingProfile {
  id: string;
  nickname: string;
  contact_email: string;
  location: string;
  match_preferences: string;
  birth_year: string;
  gender: string;
  career_field: string;
  self_description: string;
  truth_lie: string;
  ideal_day: string;
  qualities_looking_for: string;
  core_values: string;
  deal_breakers: string;
  interests: string;
  message: string;
  other_share: string;
  created_at: string;
}

interface MigrationResult {
  email: string;
  status: 'migrated' | 'not_found' | 'already_migrated' | 'error';
  message?: string;
}

async function getDatingProfiles(): Promise<DatingProfile[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.DATING_PROFILES}!A:R`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    id: row[0] || '',
    nickname: row[1] || '',
    contact_email: row[2] || '',
    location: row[3] || '',
    match_preferences: row[4] || '',
    birth_year: row[5] || '',
    gender: row[6] || '',
    career_field: row[7] || '',
    self_description: row[8] || '',
    truth_lie: row[9] || '',
    ideal_day: row[10] || '',
    qualities_looking_for: row[11] || '',
    core_values: row[12] || '',
    deal_breakers: row[13] || '',
    interests: row[14] || '',
    message: row[15] || '',
    other_share: row[16] || '',
    created_at: row[17] || '',
  }));
}

async function getMembers(): Promise<{ email: string; rowIndex: number; hasDatingData: boolean }[]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!A:BA`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  return rows.slice(1).map((row, index) => ({
    email: (row[2] || '').toLowerCase(),
    rowIndex: index + 2, // +2 for 1-based index and header row
    hasDatingData: row[52] === 'TRUE', // dating_profile_complete column
  }));
}

async function updateMemberDatingFields(
  rowIndex: number,
  profile: DatingProfile,
  dryRun: boolean
): Promise<void> {
  const values = [
    profile.self_description,      // AR (43)
    profile.truth_lie,             // AS (44)
    profile.ideal_day,             // AT (45)
    profile.qualities_looking_for, // AU (46)
    profile.core_values,           // AV (47)
    profile.deal_breakers,         // AW (48)
    profile.interests,             // AX (49)
    profile.message,               // AY (50) - dating_message
    profile.other_share,           // AZ (51)
    'TRUE',                        // BA (52) - dating_profile_complete
  ];

  if (dryRun) {
    console.log(`  [DRY RUN] Would update row ${rowIndex} with:`, values.slice(0, 3), '...');
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!AR${rowIndex}:BA${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

async function migrate(dryRun: boolean = false): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Dating Profiles Migration ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);

  // Fetch data
  console.log('Fetching DatingProfiles...');
  const datingProfiles = await getDatingProfiles();
  console.log(`Found ${datingProfiles.length} dating profiles\n`);

  console.log('Fetching Members...');
  const members = await getMembers();
  console.log(`Found ${members.length} members\n`);

  // Create email -> member lookup (exact match only per validation session)
  const membersByEmail = new Map(
    members.map(m => [m.email, m])
  );

  // Process each dating profile
  const results: MigrationResult[] = [];

  for (const profile of datingProfiles) {
    const email = profile.contact_email.toLowerCase();
    console.log(`Processing: ${email}`);

    const member = membersByEmail.get(email);

    if (!member) {
      console.log(`  ❌ Member not found`);
      results.push({ email, status: 'not_found' });
      continue;
    }

    if (member.hasDatingData) {
      console.log(`  ⏭️  Already has dating data, skipping`);
      results.push({ email, status: 'already_migrated' });
      continue;
    }

    try {
      await updateMemberDatingFields(member.rowIndex, profile, dryRun);
      console.log(`  ✅ Migrated successfully`);
      results.push({ email, status: 'migrated' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ❌ Error: ${message}`);
      results.push({ email, status: 'error', message });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Migration Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total profiles: ${datingProfiles.length}`);
  console.log(`Migrated: ${results.filter(r => r.status === 'migrated').length}`);
  console.log(`Already migrated: ${results.filter(r => r.status === 'already_migrated').length}`);
  console.log(`Not found: ${results.filter(r => r.status === 'not_found').length}`);
  console.log(`Errors: ${results.filter(r => r.status === 'error').length}`);

  if (results.filter(r => r.status === 'not_found').length > 0) {
    console.log('\nProfiles with no matching member (review manually):');
    results
      .filter(r => r.status === 'not_found')
      .forEach(r => console.log(`  - ${r.email}`));
  }

  if (results.filter(r => r.status === 'error').length > 0) {
    console.log('\nProfiles with errors:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`  - ${r.email}: ${r.message}`));
  }

  console.log(`\n${dryRun ? 'Dry run complete. Run without --dry-run to apply changes.' : 'Migration complete!'}\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

migrate(dryRun).catch(console.error);
