
import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// CSV Parser consistent with RFC 4180
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

async function ensureSheetExists() {
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });

    // Check if sheet exists
    const sheetExists = spreadsheet.data.sheets?.some(
        s => s.properties?.title === 'DatingProfiles'
    );

    if (!sheetExists) {
        console.log('DatingProfiles sheet not found. Creating...');
        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            addSheet: {
                                properties: {
                                    title: 'DatingProfiles',
                                },
                            },
                        },
                    ],
                },
            });
            console.log('Created DatingProfiles sheet');
        } catch (error) {
            console.error('Error creating sheet:', error);
            throw error;
        }
    } else {
        console.log('DatingProfiles sheet exists');
    }
}

async function seedSheetHeaders() {
    await ensureSheetExists();

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'DatingProfiles!A1:R1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[
                'id',
                'nickname',
                'contact_email',
                'location',
                'match_preferences',
                'birth_year',
                'gender',
                'career_field',
                'self_description',
                'truth_lie',
                'ideal_day',
                'qualities_looking_for',
                'core_values',
                'deal_breakers',
                'interests',
                'message',
                'other_share',
                'created_at'
            ]],
        },
    });

    console.log('Sheet headers updated');
}

async function seedDatingProfiles() {
    const csvPath = path.join(process.cwd(), 'docs', 'ABG_date_matching_data.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = parseCSV(csvContent);

    // Skip header row
    const dataRows = parsed.slice(1);

    // CSV Mapping indices (based on inspection):
    // 0: Time -> created_at
    // 1: Nickname -> nickname
    // 2: Email -> contact_email
    // 3: Location -> location
    // 4: Match Preferences -> match_preferences
    // 5: Birth Year -> birth_year
    // 6: Gender -> gender
    // 7: Career -> career_field
    // 8: 3 Words -> self_description
    // 9: 2 Truths 1 Lie -> truth_lie
    // 10: Ideal Day -> ideal_day
    // 11: Qualities -> qualities_looking_for
    // 12: Core Values -> core_values
    // 13: Deal Breakers -> deal_breakers
    // 14: Interests -> interests
    // 15: Message -> message
    // 16: Other -> other_share

    const profiles = dataRows.map(row => {
        const get = (idx: number) => row[idx] || '';

        // Generate a simple ID or use email hash? UUID is safer
        const id = uuidv4().substring(0, 8);

        return [
            id,
            get(1), // nickname
            get(2), // contact_email
            get(3), // location
            get(4), // match_preferences
            get(5), // birth_year
            get(6), // gender
            get(7), // career_field
            get(8), // self_description
            get(9), // truth_lie
            get(10), // ideal_day
            get(11), // qualities_looking_for
            get(12), // core_values
            get(13), // deal_breakers
            get(14), // interests
            get(15), // message
            get(16), // other_share
            get(0), // created_at (Timestamp)
        ];
    });

    if (profiles.length === 0) {
        console.log('No profiles found in CSV');
        return;
    }

    // Clear existing info to key fresh
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: 'DatingProfiles!A2:Z',
    });

    // Write new data
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'DatingProfiles!A:R',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: profiles },
    });

    console.log(`Seeded ${profiles.length} dating profiles`);
}

async function main() {
    if (!SPREADSHEET_ID) {
        console.error('GOOGLE_SHEETS_ID not set in environment');
        process.exit(1);
    }

    console.log('Starting Dating Profiles seed...');
    await seedSheetHeaders();
    await seedDatingProfiles();
    console.log('Seed complete!');
}

main().catch(console.error);
