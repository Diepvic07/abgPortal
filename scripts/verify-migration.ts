/**
 * Verify Migration Script
 * Quick verification of member count and data integrity after migration.
 * Usage: npx tsx scripts/verify-migration.ts
 */

import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

async function verify() {
  console.log('='.repeat(50));
  console.log('Migration Verification');
  console.log('='.repeat(50));
  console.log('');

  // Get Members sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Members!A:AP',
  });

  const rows = response.data.values || [];
  const members = rows.slice(1); // Skip header

  console.log(`Total members: ${members.length}`);
  console.log('');

  // Count by tier
  const premium = members.filter(r => r[12] === 'TRUE').length;
  const basic = members.filter(r => r[12] === 'FALSE').length;
  console.log(`Premium (paid=TRUE): ${premium}`);
  console.log(`Basic (paid=FALSE): ${basic}`);
  console.log('');

  // Count by approval status
  const approved = members.filter(r => r[40] === 'approved').length;
  const pending = members.filter(r => r[40] === 'pending').length;
  console.log(`Approved: ${approved}`);
  console.log(`Pending: ${pending}`);
  console.log('');

  // Check CSV imported
  const csvImported = members.filter(r => r[41] === 'TRUE').length;
  console.log(`CSV imported: ${csvImported}`);
  console.log('');

  // Find admin
  const admin = members.find(r => r[2] === 'diepvic@gmail.com');
  if (admin) {
    console.log('Admin account: ✓ Found');
    console.log(`  - Email: ${admin[2]}`);
    console.log(`  - Paid: ${admin[12]}`);
  } else {
    console.log('Admin account: ✗ NOT FOUND');
  }
  console.log('');

  // Sample members (first 3 CSV members)
  console.log('Sample members:');
  members.slice(0, 3).forEach((m, i) => {
    console.log(`  ${i + 1}. ${m[1]} (${m[2]}) - ${m[32] || 'no class'}`);
  });
  console.log('');

  // Validation
  console.log('='.repeat(50));
  const expected = 90; // 89 CSV members + 1 admin
  if (members.length === expected) {
    console.log(`✓ PASS: Member count matches (${expected})`);
  } else {
    console.log(`✗ FAIL: Expected ${expected}, got ${members.length}`);
  }

  if (premium === 1 && basic === expected - 1) {
    console.log(`✓ PASS: Tier distribution correct (1 premium, ${expected - 1} basic)`);
  } else {
    console.log(`✗ WARN: Unexpected tier distribution (${premium} premium, ${basic} basic)`);
  }

  if (approved === members.length) {
    console.log('✓ PASS: All members approved');
  } else {
    console.log(`✗ WARN: ${members.length - approved} members not approved`);
  }
  console.log('='.repeat(50));
}

verify().catch(console.error);
