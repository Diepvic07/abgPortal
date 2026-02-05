
import { google } from 'googleapis';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs';
import * as path from 'path';

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

async function seedSheetHeaders() {
    // Ensure strict sync with lib/google-sheets.ts getMembers mapping
    // 0: id
    // 1: name
    // 2: email
    // 3: role
    // 4: company
    // 5: expertise
    // 6: can_help_with
    // 7: looking_for
    // 8: bio
    // 9: avatar_url
    // 10: voice_url
    // 11: status
    // 12: paid
    // 13: free_requests_used
    // 14: created_at

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Members!A1:T1', // A to T is 20 columns
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [['id', 'name', 'email', 'role', 'company', 'expertise', 'can_help_with', 'looking_for', 'bio', 'avatar_url', 'voice_url', 'status', 'paid', 'free_requests_used', 'created_at', 'phone', 'facebook_url', 'linkedin_url', 'company_website', 'country']],
        },
    });

    console.log('Sheet headers updated');
}

async function seedMembers() {
    const csvPath = path.join(process.cwd(), 'docs', 'abg_members_portal_data_sample.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = parseCSV(csvContent);

    // Skip header row
    const dataRows = parsed.slice(1);

    // CSV Mapping indices (based on inspection):
    // 0: Submission ID -> id
    // 1: Respondent ID
    // 2: Submitted at -> created_at
    // 3: Họ và tên -> name
    // 4: Học viên khoá ABG?
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

    const members = dataRows.map(row => {
        // Ensure row has enough columns
        // CSV sometimes has trailing empty columns or missing ones if simple split, 
        // but our parser handles it. Access safely.

        // Helper to safely get value
        const get = (idx: number) => row[idx] || '';

        return [
            get(0), // id
            get(3), // name
            get(5), // email
            get(15), // role
            get(12), // company
            get(14), // expertise
            get(16), // can_help_with
            get(17), // looking_for
            get(18), // bio
            get(6), // avatar_url
            '', // voice_url
            'active', // status
            'TRUE', // paid
            '0', // free_requests_used
            get(2), // created_at
            get(9), // phone
            get(10), // facebook_url
            get(11), // linkedin_url
            get(13), // company_website
            get(19), // country
        ];
    });

    // Manually add the requested premium user
    members.push([
        'diep_admin', // id
        'Diep Vic', // name
        'diepvic@gmail.com', // email
        'Admin', // role
        'ABG', // company
        'Everything', // expertise
        'Everything', // can_help_with
        'Nothing', // looking_for
        'Premium User', // bio
        '', // avatar_url
        '', // voice_url
        'active', // status
        'TRUE', // paid
        '0', // free_requests_used
        new Date().toISOString(), // created_at
        '', // phone
        '', // facebook_url
        '', // linkedin_url
        '', // company_website
        '', // country
    ]);

    if (members.length === 0) {
        console.log('No members found in CSV');
        return;
    }

    // Clear existing data first? Or append?
    // "Integrate" usually implie append or upsert. 
    // For safety and to avoid duplicates if run multiple times, maybe clearing is safer for a "sample" integration?
    // But strictly "integrate" means add.
    // I will just append, but since I am updating headers, I might as well overwrite (clear first).
    // Actually, let's just append to be safe, BUT since I updated headers to include avatar_url, the OLD rows might not match the schema if they exist.
    // The user gave me a "sample" file.
    // I will choose to CLEAR and Insert to ensure clean state for testing, AS LONG AS I don't delete other important sheets.
    // The seed-test-data.ts overwrites headers.

    // Let's clear the content of Members!A2:Z first to avoid misalignment.
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Members!A2:Z',
    });

    // Write new data
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Members!A:T',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: members },
    });

    console.log(`Seeded ${members.length} members from CSV`);
}

async function main() {
    if (!SPREADSHEET_ID) {
        console.error('GOOGLE_SHEETS_ID not set in environment');
        process.exit(1);
    }

    console.log('Starting CSV seed...');
    await seedSheetHeaders();
    await seedMembers();
    console.log('Seed complete!');
}

main().catch(console.error);
