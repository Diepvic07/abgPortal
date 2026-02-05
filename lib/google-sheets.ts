import { google } from 'googleapis';
import { Member, ConnectionRequest, Connection } from '@/types';
import { DatingProfile } from '@/types/dating';
import { formatDate } from './utils';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

export const SHEETS = {
  MEMBERS: 'Members',
  REQUESTS: 'Requests',
  CONNECTIONS: 'Connections',
  DATING_PROFILES: 'DatingProfiles',
  AUDIT: 'RequestAudit',
} as const;

// Generic read function - extended range to include new columns
export async function getSheetData(sheetName: string): Promise<string[][]> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:AN`,
  });
  return response.data.values || [];
}

// Generic append function - extended range to include new columns
async function appendRow(sheetName: string, values: string[]): Promise<void> {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:AN`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// Members operations
export async function getMembers(): Promise<Member[]> {
  const rows = await getSheetData(SHEETS.MEMBERS);
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    role: row[3] || '',
    company: row[4] || '',
    expertise: row[5] || '',
    can_help_with: row[6] || '',
    looking_for: row[7] || '',
    bio: row[8] || '',
    avatar_url: row[9] || undefined,
    voice_url: row[10] || undefined,
    status: (row[11] as 'active' | 'inactive') || 'active',
    paid: row[12] === 'TRUE',
    free_requests_used: parseInt(row[13] || '0', 10),
    created_at: row[14] || '',
    phone: row[15] || undefined,
    facebook_url: row[16] || undefined,
    linkedin_url: row[17] || undefined,
    company_website: row[18] || undefined,
    country: row[19] || undefined,
    open_to_work: row[20] === 'TRUE',
    job_preferences: row[21] || '',
    hiring: row[22] === 'TRUE',
    hiring_preferences: row[23] || '',
    gender: row[24] as 'Female' | 'Male' | 'Undisclosed' | undefined,
    relationship_status: row[25] || undefined,
    // Auth fields (columns 26-31)
    auth_provider: row[26] || undefined,
    auth_provider_id: row[27] || undefined,
    last_login: row[28] || undefined,
    account_status: (row[29] as 'active' | 'suspended' | 'banned') || 'active',
    total_requests_count: parseInt(row[30] || '0', 10),
    requests_today: parseInt(row[31] || '0', 10),
    // New profile fields (columns 32-39, AG-AN)
    abg_class: row[32] || undefined,
    nickname: row[33] || undefined,
    display_nickname_in_search: row[34] === 'TRUE',
    display_nickname_in_match: row[35] === 'TRUE',
    display_nickname_in_email: row[36] === 'TRUE',
    discord_username: row[37] || undefined,
    payment_status: (row[38] as 'unpaid' | 'pending' | 'paid' | 'expired') || 'unpaid',
    membership_expiry: row[39] || undefined,
  }));
}

export async function getActivePaidMembers(): Promise<Member[]> {
  const members = await getMembers();
  return members.filter(m => m.status === 'active' && m.paid);
}

export async function getMemberById(id: string): Promise<Member | null> {
  const members = await getMembers();
  return members.find(m => m.id === id) || null;
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const members = await getMembers();
  return members.find(m => m.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function addMember(member: Member): Promise<void> {
  await appendRow(SHEETS.MEMBERS, [
    member.id,
    member.name,
    member.email,
    member.role,
    member.company,
    member.expertise,
    member.can_help_with,
    member.looking_for,
    member.bio,
    member.avatar_url || '',
    member.voice_url || '',
    member.status,
    member.paid ? 'TRUE' : 'FALSE',
    member.free_requests_used.toString(),
    member.created_at,
    member.phone || '',
    member.facebook_url || '',
    member.linkedin_url || '',
    member.company_website || '',
    member.country || '',
    member.open_to_work ? 'TRUE' : 'FALSE',
    member.job_preferences || '',
    member.hiring ? 'TRUE' : 'FALSE',
    member.hiring_preferences || '',
    member.gender || '',
    member.relationship_status || '',
    // Auth fields
    member.auth_provider || '',
    member.auth_provider_id || '',
    member.last_login || '',
    member.account_status || 'active',
    (member.total_requests_count || 0).toString(),
    (member.requests_today || 0).toString(),
    // New profile fields (columns AG-AN)
    member.abg_class || '',
    member.nickname || '',
    member.display_nickname_in_search ? 'TRUE' : 'FALSE',
    member.display_nickname_in_match ? 'TRUE' : 'FALSE',
    member.display_nickname_in_email ? 'TRUE' : 'FALSE',
    member.discord_username || '',
    member.payment_status || 'unpaid',
    member.membership_expiry || '',
  ]);
}

export async function updateMemberFreeRequests(id: string, count: number): Promise<void> {
  const rows = await getSheetData(SHEETS.MEMBERS);
  const rowIndex = rows.findIndex(row => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!N${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[count.toString()]] },
  });
}

export async function updateMemberLastLogin(email: string): Promise<void> {
  const rows = await getSheetData(SHEETS.MEMBERS);
  // Find by email (Column B)
  const rowIndex = rows.findIndex(row => row[1] === email);
  if (rowIndex === -1) return;

  const timestamp = formatDate();
  const currentRow = rows[rowIndex];

  // Update last_login (AC - col 29), account_status (AD - col 30), total_requests (AE - col 31), requests_today (AF - col 32)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!AC${rowIndex + 1}:AF${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        timestamp,
        currentRow[29] || 'active', // Only set to active if empty
        currentRow[30] || '0',
        currentRow[31] || '0'
      ]]
    },
  });
}


export async function incrementMemberRequestCounts(id: string): Promise<void> {
  const member = await getMemberById(id);
  if (!member) return;

  const rows = await getSheetData(SHEETS.MEMBERS);
  const rowIndex = rows.findIndex(row => row[0] === id);
  if (rowIndex === -1) return;

  const newTotalCount = (member.total_requests_count || 0) + 1;
  const newTodayCount = (member.requests_today || 0) + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!AE${rowIndex + 1}:AF${rowIndex + 1}`, // Columns 31-32
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newTotalCount.toString(), newTodayCount.toString()]] },
  });
}


// Update member fields (partial update)
export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, 'id' | 'email' | 'created_at'>>
): Promise<boolean> {
  const rows = await getSheetData(SHEETS.MEMBERS);
  const rowIndex = rows.findIndex(row => row[0] === id);
  if (rowIndex === -1) return false;

  const currentRow = rows[rowIndex];

  // Map field names to column indices
  const fieldMap: Record<string, number> = {
    name: 1,
    role: 3,
    company: 4,
    expertise: 5,
    can_help_with: 6,
    looking_for: 7,
    bio: 8,
    avatar_url: 9,
    voice_url: 10,
    status: 11,
    paid: 12,
    phone: 15,
    facebook_url: 16,
    linkedin_url: 17,
    company_website: 18,
    country: 19,
    open_to_work: 20,
    job_preferences: 21,
    hiring: 22,
    hiring_preferences: 23,
    gender: 24,
    relationship_status: 25,
    // New profile fields
    abg_class: 32,
    nickname: 33,
    display_nickname_in_search: 34,
    display_nickname_in_match: 35,
    display_nickname_in_email: 36,
    discord_username: 37,
    payment_status: 38,
    membership_expiry: 39,
  };

  // Build update values - ensure row has 40 columns
  const newRow = [...currentRow];
  while (newRow.length < 40) newRow.push('');

  for (const [field, value] of Object.entries(updates)) {
    const colIndex = fieldMap[field];
    if (colIndex === undefined) continue;

    if (typeof value === 'boolean') {
      newRow[colIndex] = value ? 'TRUE' : 'FALSE';
    } else {
      newRow[colIndex] = value?.toString() || '';
    }
  }

  // Update the entire row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.MEMBERS}!A${rowIndex + 1}:AN${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [newRow] },
  });

  return true;
}

// Get connections where user is the target (for incoming matches)
export async function getConnectionsByTargetId(targetId: string): Promise<Connection[]> {
  const rows = await getSheetData(SHEETS.CONNECTIONS);
  if (rows.length < 2) return [];

  return rows.slice(1)
    .filter(row => row[3] === targetId) // to_id is column D (index 3)
    .map(row => ({
      id: row[0],
      request_id: row[1],
      from_id: row[2],
      to_id: row[3],
      intro_sent: row[4] === 'TRUE',
      feedback: row[5] || undefined,
      created_at: row[6],
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Requests operations
export async function addRequest(request: ConnectionRequest): Promise<void> {
  await appendRow(SHEETS.REQUESTS, [
    request.id,
    request.requester_id,
    request.request_text,
    request.matched_ids,
    request.selected_id || '',
    request.status,
    request.created_at,
  ]);
}

export async function getRequestById(id: string): Promise<ConnectionRequest | null> {
  const rows = await getSheetData(SHEETS.REQUESTS);
  const row = rows.find(r => r[0] === id);
  if (!row) return null;

  return {
    id: row[0],
    requester_id: row[1],
    request_text: row[2],
    matched_ids: row[3],
    selected_id: row[4] || undefined,
    status: row[5] as ConnectionRequest['status'],
    created_at: row[6],
  };
}

export async function getRequestsByMemberId(memberId: string): Promise<ConnectionRequest[]> {
  const rows = await getSheetData(SHEETS.REQUESTS);
  if (rows.length < 2) return [];

  return rows.slice(1)
    .filter(row => row[1] === memberId)
    .map(row => ({
      id: row[0],
      requester_id: row[1],
      request_text: row[2],
      matched_ids: row[3],
      selected_id: row[4] || undefined,
      status: row[5] as ConnectionRequest['status'],
      created_at: row[6],
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateRequestStatus(
  id: string,
  status: ConnectionRequest['status'],
  selectedId?: string
): Promise<void> {
  const rows = await getSheetData(SHEETS.REQUESTS);
  const rowIndex = rows.findIndex(row => row[0] === id);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.REQUESTS}!E${rowIndex + 1}:F${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[selectedId || '', status]] },
  });
}

// Connections operations
export async function addConnection(connection: Connection): Promise<void> {
  await appendRow(SHEETS.CONNECTIONS, [
    connection.id,
    connection.request_id,
    connection.from_id,
    connection.to_id,
    connection.intro_sent ? 'TRUE' : 'FALSE',
    connection.feedback || '',
    connection.created_at,
  ]);
}

// Dating operations
export async function getDatingProfiles(): Promise<DatingProfile[]> {
  const rows = await getSheetData(SHEETS.DATING_PROFILES);
  // Skip header
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

export async function getDatingProfileById(id: string): Promise<DatingProfile | null> {
  const profiles = await getDatingProfiles();
  return profiles.find(p => p.id === id) || null;
}

export async function getDatingProfileByEmail(email: string): Promise<DatingProfile | null> {
  const profiles = await getDatingProfiles();
  return profiles.find(p => p.contact_email === email) || null;
}

export async function addRequestAudit(audit: {
  id: string;
  member_id: string;
  request_id?: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  success: boolean;
  failure_reason?: string;
  request_type: string;
}): Promise<void> {
  try {
    await appendRow(SHEETS.AUDIT, [
      audit.id,
      audit.member_id,
      audit.request_id || '',
      audit.ip_address,
      audit.user_agent,
      audit.timestamp,
      audit.success ? 'TRUE' : 'FALSE',
      audit.failure_reason || '',
      audit.request_type,
    ]);
  } catch (error) {
    // Log error but don't throw - audit should not block main request flow
    console.error('Failed to add request audit:', error);
  }
}


