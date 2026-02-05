// Run with: npx tsx scripts/seed-test-data.ts
// Requires .env.local with Google Sheets credentials

import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

async function seedSheetHeaders() {
  // Members headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Members!A1:N1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['id', 'name', 'email', 'role', 'company', 'expertise', 'can_help_with', 'looking_for', 'bio', 'voice_url', 'status', 'paid', 'free_requests_used', 'created_at']],
    },
  });

  // Requests headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Requests!A1:G1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['id', 'requester_id', 'request_text', 'matched_ids', 'selected_id', 'status', 'created_at']],
    },
  });

  // Connections headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Connections!A1:G1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['id', 'request_id', 'from_id', 'to_id', 'intro_sent', 'feedback', 'created_at']],
    },
  });

  console.log('Sheet headers set up');
}

async function seedMembers() {
  const testMembers = [
    ['m1', 'Alice Nguyen', 'alice@test.com', 'Product Manager', 'Grab', 'Product strategy, mobile apps, ride-hailing', 'Mentoring PMs, product reviews', 'Looking for engineering co-founder', 'Alice is a Product Manager at Grab with expertise in mobile product strategy and ride-hailing platforms. She enjoys mentoring other product managers and is currently seeking an engineering co-founder for her next venture.', '', 'active', 'TRUE', '0', new Date().toISOString()],
    ['m2', 'Bob Tran', 'bob@test.com', 'CTO', 'VNPay', 'Fintech, payments, system architecture', 'Technical architecture reviews, fintech advice', 'Looking for Series A investors', 'Bob is the CTO at VNPay, leading the technical vision for one of Vietnam\'s largest payment platforms. He specializes in fintech architecture and is actively seeking Series A funding for expansion.', '', 'active', 'TRUE', '0', new Date().toISOString()],
    ['m3', 'Carol Le', 'carol@test.com', 'Head of Sales', 'Shopee', 'B2B sales, enterprise accounts, marketplace', 'Sales strategy, enterprise introductions', 'Looking for marketing experts', 'Carol leads the B2B sales division at Shopee, managing enterprise accounts across Southeast Asia. She is passionate about sales strategy and currently looking for marketing expertise to complement her team.', '', 'active', 'TRUE', '0', new Date().toISOString()],
    ['m4', 'David Pham', 'david@test.com', 'Founder', 'EdTech Startup', 'EdTech, online learning, K-12', 'EdTech insights, curriculum design', 'Looking for seed funding', 'David is the founder of an innovative EdTech startup focused on K-12 online learning. With deep expertise in curriculum design, he is seeking seed funding to scale his platform across Vietnam.', '', 'active', 'TRUE', '0', new Date().toISOString()],
    ['m5', 'Eva Hoang', 'eva@test.com', 'VP Marketing', 'Tiki', 'Digital marketing, e-commerce, brand building', 'Marketing strategy, brand positioning', 'Looking for UX designers', 'Eva is the VP of Marketing at Tiki, one of Vietnam\'s leading e-commerce platforms. She brings deep expertise in digital marketing and brand building, and is currently seeking talented UX designers.', '', 'active', 'TRUE', '0', new Date().toISOString()],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Members!A:N',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: testMembers },
  });

  console.log('Seeded 5 test members');
}

async function main() {
  if (!SPREADSHEET_ID) {
    console.error('GOOGLE_SHEETS_ID not set in environment');
    process.exit(1);
  }

  console.log('Starting seed...');
  await seedSheetHeaders();
  await seedMembers();
  console.log('Seed complete!');
}

main().catch(console.error);
