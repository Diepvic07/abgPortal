import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Don't do replace since dotenv already handles it
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,  // No replace
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

async function test() {
  try {
    console.log('Testing Google Sheets connection...');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Members!A:C',
    });
    
    console.log('Success! Found', response.data.values?.length || 0, 'rows');
    if (response.data.values && response.data.values.length > 0) {
      console.log('Headers:', response.data.values[0]);
      const emails = response.data.values.slice(1).map((r: string[]) => r[2]);
      console.log('Looking for diepvic@gmail.com...');
      const found = emails.find((e: string) => e?.toLowerCase() === 'diepvic@gmail.com');
      console.log('Found:', found ? 'YES' : 'NO');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
  }
}

test();
