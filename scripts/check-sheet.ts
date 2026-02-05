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

async function main() {
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });

        const sheetsList = response.data.sheets?.map(s => s.properties?.title) || [];
        console.log('Current Sheets/Tabs:', JSON.stringify(sheetsList, null, 2));
    } catch (error) {
        console.error('Error fetching sheet metadata:', error);
    }
}

main();
