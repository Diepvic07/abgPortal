import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID as string;

async function check() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'News!A1:O10',
  });
  const rows = res.data.values || [];
  console.log('Header:', rows[0]?.join(' | '));
  console.log('---');
  rows.slice(1).forEach((r, i) => {
    console.log(`Row ${i + 1}: id=${r[0]} | img_url="${r[6] || '(empty)'}" | title_vi="${(r[12] || '(empty)').slice(0, 50)}"`);
  });
}

check().catch(console.error);
