import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID as string;

async function fix() {
  // news-008 is row 9 (header + 8 data rows). Column G = image_url
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'News!G9',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop']],
    },
  });
  console.log('✓ Fixed image URL for news-008');
}

fix().catch(console.error);
