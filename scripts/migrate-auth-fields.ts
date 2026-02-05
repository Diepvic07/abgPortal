import { getMembers, updateMemberLastLogin } from '../lib/google-sheets';

/**
 * Migration script to prepare existing members for the new authentication system.
 * 
 * Instructions:
 * 1. Ensure you have added the new columns to Google Sheets:
 *    AA: auth_provider
 *    AB: auth_provider_id
 *    AC: last_login
 *    AD: account_status
 *    AE: total_requests_count
 *    AF: requests_today
 * 
 * 2. Run this script to initialize account_status and counts.
 */
async function migrateExistingUsers() {
    console.log('Fetching members...');
    const members = await getMembers();
    console.log(`Found ${members.length} members.`);

    for (const member of members) {
        if (!member.account_status) {
            console.log(`Initializing security fields for: ${member.email}`);
            // Using updateMemberLastLogin as a proxy to update fields (it will set them to defaults)
            // Actually we should create a dedicated init function in google-sheets.ts if needed,
            // but updateMemberLastLogin already handles most of it.
            await updateMemberLastLogin(member.email);
        }
    }

    console.log('Migration complete!');
}

migrateExistingUsers().catch(console.error);
