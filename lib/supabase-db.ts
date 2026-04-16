import { createServerSupabaseClient } from './supabase/server';
import { Member, ConnectionRequest, Connection, LoveMatchRequest, NewsArticle, NewsCategory, ContactRequest, PaymentRecord, BugReport, AbgClass } from '@/types';
import { generateProfileSlug } from './profile-url';

// ==================== Helpers ====================

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

function mapRowToMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as string,
    company: row.company as string,
    expertise: row.expertise as string,
    can_help_with: row.can_help_with as string,
    looking_for: row.looking_for as string,
    bio: row.bio as string,
    avatar_url: nullToUndefined(row.avatar_url as string | null),
    status: (row.status as 'active' | 'inactive') || 'active',
    paid: row.paid as boolean,
    free_requests_used: (row.free_requests_used as number) || 0,
    created_at: row.created_at as string,
    phone: nullToUndefined(row.phone as string | null),
    facebook_url: nullToUndefined(row.facebook_url as string | null),
    linkedin_url: nullToUndefined(row.linkedin_url as string | null),
    company_website: nullToUndefined(row.company_website as string | null),
    country: nullToUndefined(row.country as string | null),
    open_to_work: (row.open_to_work as boolean) || false,
    job_preferences: (row.job_preferences as string) || '',
    hiring: (row.hiring as boolean) || false,
    hiring_preferences: (row.hiring_preferences as string) || '',
    gender: nullToUndefined(row.gender as 'Female' | 'Male' | 'Undisclosed' | null),
    relationship_status: nullToUndefined(row.relationship_status as string | null),
    birth_year: row.birth_year as string || '',
    auth_provider: nullToUndefined(row.auth_provider as string | null),
    auth_provider_id: nullToUndefined(row.auth_provider_id as string | null),
    last_login: nullToUndefined(row.last_login as string | null),
    account_status: ((row.account_status as string) || 'active') as 'active' | 'suspended' | 'banned',
    total_requests_count: (row.total_requests_count as number) || 0,
    requests_today: (row.requests_today as number) || 0,
    abg_class: nullToUndefined(row.abg_class as string | null),
    nickname: nullToUndefined(row.nickname as string | null),
    display_nickname_in_search: (row.display_nickname_in_search as boolean) || false,
    display_nickname_in_match: (row.display_nickname_in_match as boolean) || false,
    display_nickname_in_email: (row.display_nickname_in_email as boolean) || false,
    payment_status: ((row.payment_status as string) || 'unpaid') as 'unpaid' | 'pending' | 'paid' | 'expired',
    membership_expiry: nullToUndefined(row.membership_expiry as string | null),
    approval_status: ((row.approval_status as string) || 'approved') as 'pending' | 'approved' | 'rejected',
    is_csv_imported: (row.is_csv_imported as boolean) || false,
    potential_duplicate_of: nullToUndefined(row.potential_duplicate_of as string | null),
    duplicate_note: nullToUndefined(row.duplicate_note as string | null),
    is_admin: (row.is_admin as boolean) || false,
    self_description: nullToUndefined(row.self_description as string | null),
    truth_lie: nullToUndefined(row.truth_lie as string | null),
    ideal_day: nullToUndefined(row.ideal_day as string | null),
    qualities_looking_for: nullToUndefined(row.qualities_looking_for as string | null),
    core_values: nullToUndefined(row.core_values as string | null),
    deal_breakers: nullToUndefined(row.deal_breakers as string | null),
    interests: nullToUndefined(row.interests as string | null),
    dating_message: nullToUndefined(row.dating_message as string | null),
    other_share: nullToUndefined(row.other_share as string | null),
    dating_profile_complete: (row.dating_profile_complete as boolean) || false,
    requests_this_month: (row.requests_this_month as number) || 0,
    month_reset_date: nullToUndefined(row.month_reset_date as string | null),
    searches_this_month: (row.searches_this_month as number) || 0,
    search_month_reset_date: nullToUndefined(row.search_month_reset_date as string | null),
    locale: (nullToUndefined(row.locale as string | null) as 'en' | 'vi' | undefined) ?? 'vi',
    public_profile_slug: nullToUndefined(row.public_profile_slug as string | null),
    public_profile_enabled: (row.public_profile_enabled as boolean) || false,
  };
}

function mapRowToConnectionRequest(row: Record<string, unknown>): ConnectionRequest {
  return {
    id: row.id as string,
    requester_id: row.requester_id as string,
    request_text: row.request_text as string,
    matched_ids: row.matched_ids as string,
    selected_id: nullToUndefined(row.selected_id as string | null),
    status: (row.status as ConnectionRequest['status']),
    created_at: row.created_at as string,
    category: nullToUndefined(row.category as ConnectionRequest['category'] | null),
    custom_intro_text: nullToUndefined(row.custom_intro_text as string | null),
  };
}

function mapRowToConnection(row: Record<string, unknown>): Connection {
  return {
    id: row.id as string,
    request_id: row.request_id as string,
    from_id: row.from_id as string,
    to_id: row.to_id as string,
    intro_sent: (row.intro_sent as boolean) || false,
    feedback: nullToUndefined(row.feedback as string | null),
    created_at: row.created_at as string,
  };
}

function mapRowToLoveMatchRequest(row: Record<string, unknown>): LoveMatchRequest {
  const fromProfile = row.from_profile_shared;
  const toProfile = row.to_profile_shared;
  return {
    id: row.id as string,
    request_id: row.request_id as string,
    from_id: row.from_id as string,
    to_id: row.to_id as string,
    status: (row.status as LoveMatchRequest['status']) || 'pending',
    from_profile_shared: typeof fromProfile === 'string' ? fromProfile : JSON.stringify(fromProfile ?? {}),
    to_profile_shared: toProfile != null ? (typeof toProfile === 'string' ? toProfile : JSON.stringify(toProfile)) : undefined,
    viewed_at: nullToUndefined(row.viewed_at as string | null),
    resolved_at: nullToUndefined(row.resolved_at as string | null),
    created_at: row.created_at as string,
  };
}

function mapRowToNewsArticle(row: Record<string, unknown>): NewsArticle {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    category: (row.category as NewsCategory) || 'Announcement',
    excerpt: (row.excerpt as string) || '',
    content: (row.content as string) || '',
    image_url: nullToUndefined(row.image_url as string | null),
    author_name: (row.author_name as string) || 'ABG Admin',
    published_date: (row.published_date as string) || '',
    is_published_vi: (row.is_published_vi as boolean) || false,
    is_published_en: (row.is_published_en as boolean) || false,
    is_featured: (row.is_featured as boolean) || false,
    created_at: row.created_at as string,
    title_vi: nullToUndefined(row.title_vi as string | null),
    excerpt_vi: nullToUndefined(row.excerpt_vi as string | null),
    content_vi: nullToUndefined(row.content_vi as string | null),
    tagged_member_ids: (row.tagged_member_ids as string[] | null) || [],
  };
}

// ==================== Members ====================

export async function getMembers(): Promise<Member[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members').select('*').order('created_at');
  if (error) {
    console.error('[SupabaseDB] getMembers error:', error);
    throw new Error(`Failed to get members: ${error.message}`);
  }
  return (data || []).map(row => mapRowToMember(row as unknown as Record<string, unknown>));
}

export async function getActivePaidMembers(): Promise<Member[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members').select('*').eq('status', 'active').eq('paid', true);
  if (error) {
    console.error('[SupabaseDB] getActivePaidMembers error:', error);
    throw new Error(`Failed to get active paid members: ${error.message}`);
  }
  return (data || []).map(row => mapRowToMember(row as unknown as Record<string, unknown>));
}

export async function getMemberById(id: string): Promise<Member | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getMemberById error:', error);
    throw new Error(`Failed to get member by id: ${error.message}`);
  }
  return data ? mapRowToMember(data as unknown as Record<string, unknown>) : null;
}

export async function getMemberByPublicProfileSlug(slug: string): Promise<Member | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members').select('*').eq('public_profile_slug', slug).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getMemberByPublicProfileSlug error:', error);
    throw new Error(`Failed to get member by public profile slug: ${error.message}`);
  }
  return data ? mapRowToMember(data as unknown as Record<string, unknown>) : null;
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const db = createServerSupabaseClient();
  // Use .select() (not .maybeSingle()) to handle potential duplicate rows gracefully.
  // If duplicates exist, pick the "best" row: approved > pending > rejected, then active > inactive.
  const { data, error } = await db.from('members').select('*').ilike('email', email);
  if (error) {
    console.error('[SupabaseDB] getMemberByEmail error:', error);
    throw new Error(`Failed to get member by email: ${error.message}`);
  }
  if (!data || data.length === 0) return null;
  if (data.length === 1) return mapRowToMember(data[0] as unknown as Record<string, unknown>);

  // Multiple rows for same email — pick the best one
  const approvalOrder: Record<string, number> = { approved: 0, pending: 1, rejected: 2 };
  const statusOrder: Record<string, number> = { active: 0, inactive: 1 };
  const sorted = [...data].sort((aRow, bRow) => {
    const a = aRow as Record<string, unknown>;
    const b = bRow as Record<string, unknown>;
    const aApproval = approvalOrder[(a.approval_status as string) ?? 'pending'] ?? 1;
    const bApproval = approvalOrder[(b.approval_status as string) ?? 'pending'] ?? 1;
    if (aApproval !== bApproval) return aApproval - bApproval;
    const aStatus = statusOrder[(a.status as string) ?? 'inactive'] ?? 1;
    const bStatus = statusOrder[(b.status as string) ?? 'inactive'] ?? 1;
    return aStatus - bStatus;
  });
  console.warn(`[SupabaseDB] getMemberByEmail: found ${data.length} rows for ${email}, using best match.`);
  return mapRowToMember(sorted[0] as unknown as Record<string, unknown>);
}

export async function addMember(member: Member): Promise<void> {
  console.log(`[SupabaseDB] Adding member: ${member.email}`);
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').insert({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    company: member.company,
    expertise: member.expertise,
    can_help_with: member.can_help_with,
    looking_for: member.looking_for,
    bio: member.bio,
    avatar_url: member.avatar_url ?? null,
    status: member.status,
    paid: member.paid,
    free_requests_used: member.free_requests_used,
    created_at: member.created_at,
    phone: member.phone ?? null,
    facebook_url: member.facebook_url ?? null,
    linkedin_url: member.linkedin_url ?? null,
    company_website: member.company_website ?? null,
    country: member.country ?? null,
    open_to_work: member.open_to_work ?? false,
    job_preferences: member.job_preferences ?? '',
    hiring: member.hiring ?? false,
    hiring_preferences: member.hiring_preferences ?? '',
    gender: member.gender ?? null,
    relationship_status: member.relationship_status ?? null,
    birth_year: member.birth_year ?? null,
    auth_provider: member.auth_provider ?? null,
    auth_provider_id: member.auth_provider_id ?? null,
    last_login: member.last_login ?? null,
    account_status: member.account_status ?? 'active',
    total_requests_count: member.total_requests_count ?? 0,
    requests_today: member.requests_today ?? 0,
    abg_class: member.abg_class ?? null,
    nickname: member.nickname ?? null,
    display_nickname_in_search: member.display_nickname_in_search ?? false,
    display_nickname_in_match: member.display_nickname_in_match ?? false,
    display_nickname_in_email: member.display_nickname_in_email ?? false,
    payment_status: member.payment_status ?? 'unpaid',
    membership_expiry: member.membership_expiry ?? null,
    approval_status: member.approval_status ?? 'approved',
    is_csv_imported: member.is_csv_imported ?? false,
    potential_duplicate_of: member.potential_duplicate_of ?? null,
    duplicate_note: member.duplicate_note ?? null,
    is_admin: member.is_admin ?? false,
    self_description: member.self_description ?? null,
    truth_lie: member.truth_lie ?? null,
    ideal_day: member.ideal_day ?? null,
    qualities_looking_for: member.qualities_looking_for ?? null,
    core_values: member.core_values ?? null,
    deal_breakers: member.deal_breakers ?? null,
    interests: member.interests ?? null,
    dating_message: member.dating_message ?? null,
    other_share: member.other_share ?? null,
    dating_profile_complete: member.dating_profile_complete ?? false,
    requests_this_month: member.requests_this_month ?? 0,
    month_reset_date: member.month_reset_date ?? null,
    searches_this_month: member.searches_this_month ?? 0,
    search_month_reset_date: member.search_month_reset_date ?? null,
    locale: member.locale ?? 'vi',
    public_profile_slug: member.public_profile_slug ?? generateProfileSlug(member.name, member.id),
    public_profile_enabled: member.public_profile_enabled ?? false,
  });
  if (error) {
    console.error(`[SupabaseDB] addMember error for ${member.email}:`, error);
    throw new Error(`Failed to add member: ${error.message}`);
  }
}

export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, 'id' | 'email' | 'created_at'>>
): Promise<boolean> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').update(updates).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateMember error:', error);
    throw new Error(`Failed to update member: ${error.message}`);
  }
  return true;
}

export async function updateMemberEmail(id: string, newEmail: string): Promise<boolean> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').update({ email: newEmail }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateMemberEmail error:', error);
    return false;
  }
  return true;
}

export async function updateMemberApprovalStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<boolean> {
  return updateMember(id, { approval_status: status });
}

export async function deleteMember(id: string): Promise<boolean> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseDB] deleteMember error:', error);
    throw new Error(`Failed to delete member: ${error.message}`);
  }
  return true;
}

export async function updateMemberFreeRequests(id: string, count: number): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').update({ free_requests_used: count }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateMemberFreeRequests error:', error);
    throw new Error(`Failed to update free requests: ${error.message}`);
  }
}

export async function updateMemberLastLogin(email: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('members')
    .update({ last_login: new Date().toISOString() })
    .ilike('email', email);
  if (error) {
    console.error('[SupabaseDB] updateMemberLastLogin error:', error);
    throw new Error(`Failed to update last login: ${error.message}`);
  }
}

export async function incrementMemberRequestCounts(id: string): Promise<void> {
  const member = await getMemberById(id);
  if (!member) return;
  const db = createServerSupabaseClient();
  const { error } = await db.from('members').update({
    total_requests_count: (member.total_requests_count || 0) + 1,
    requests_today: (member.requests_today || 0) + 1,
  }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] incrementMemberRequestCounts error:', error);
    throw new Error(`Failed to increment request counts: ${error.message}`);
  }
}

export async function incrementMemberMonthlyRequests(id: string): Promise<void> {
  const member = await getMemberById(id);
  if (!member) return;
  const db = createServerSupabaseClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const existingMonth = member.month_reset_date?.slice(0, 7) || '';
  const currentMonthPrefix = currentMonth.slice(0, 7);

  const newCount = existingMonth === currentMonthPrefix
    ? (member.requests_this_month || 0) + 1
    : 1;

  const { error } = await db.from('members').update({
    requests_this_month: newCount,
    month_reset_date: currentMonth,
  }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] incrementMemberMonthlyRequests error:', error);
    throw new Error(`Failed to increment monthly requests: ${error.message}`);
  }
}

// ==================== Duplicate Detection ====================

/** Normalize name for comparison: lowercase, trim, remove Vietnamese diacritics */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ');
}

export interface DuplicateMatch {
  member: Member;
  confidence: 'HIGH' | 'MEDIUM';
  reason: string;
}

/** Find potential duplicates among ALL existing members by name + class */
export async function findPotentialDuplicates(
  name: string,
  abgClass?: string,
  excludeEmail?: string
): Promise<DuplicateMatch[]> {
  const db = createServerSupabaseClient();
  let query = db.from('members').select('*');
  if (excludeEmail) {
    query = query.neq('email', excludeEmail.toLowerCase());
  }
  const { data, error } = await query;
  if (error) {
    console.error('[SupabaseDB] findPotentialDuplicates error:', error);
    return [];
  }
  if (!data || data.length === 0) return [];

  const normalizedInput = normalizeName(name);
  const matches: DuplicateMatch[] = [];

  for (const row of data) {
    const member = mapRowToMember(row as unknown as Record<string, unknown>);
    const normalizedExisting = normalizeName(member.name);
    const sameClass = abgClass && member.abg_class && abgClass === member.abg_class;

    // HIGH: exact normalized name + same class
    if (normalizedInput === normalizedExisting && sameClass) {
      matches.push({
        member,
        confidence: 'HIGH',
        reason: `Exact name match "${member.name}" + same class "${member.abg_class}"`,
      });
      continue;
    }

    // MEDIUM: name contains/contained-by + same class
    if (sameClass) {
      const isContained = normalizedExisting.includes(normalizedInput)
        || normalizedInput.includes(normalizedExisting);
      if (isContained && normalizedInput !== normalizedExisting) {
        matches.push({
          member,
          confidence: 'MEDIUM',
          reason: `Similar name "${member.name}" + same class "${member.abg_class}"`,
        });
        continue;
      }
    }

    // Exact name match without class context → still flag as HIGH
    if (normalizedInput === normalizedExisting && !sameClass) {
      matches.push({
        member,
        confidence: normalizedInput.split(' ').length >= 2 ? 'HIGH' : 'MEDIUM',
        reason: `Exact name match "${member.name}"${member.abg_class ? ` (class: ${member.abg_class})` : ''}`,
      });
    }
  }

  // Sort HIGH before MEDIUM
  return matches.sort((a, b) => (a.confidence === 'HIGH' ? -1 : 1) - (b.confidence === 'HIGH' ? -1 : 1));
}

/** Get all members flagged as potential duplicates */
export async function getDuplicateFlaggedMembers(): Promise<Member[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members')
    .select('*')
    .not('potential_duplicate_of', 'is', null)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getDuplicateFlaggedMembers error:', error);
    throw new Error(`Failed to get duplicate flagged members: ${error.message}`);
  }
  return (data || []).map(row => mapRowToMember(row as unknown as Record<string, unknown>));
}

/** Clear duplicate flag (admin decided it's not a duplicate) */
export async function clearDuplicateFlag(memberId: string): Promise<boolean> {
  const db = createServerSupabaseClient();
  // Cast needed: these columns were added via migration but not in Supabase generated types
  const updates = { potential_duplicate_of: null, duplicate_note: null } as Record<string, unknown>;
  const { error } = await db.from('members').update(updates).eq('id', memberId);
  if (error) {
    console.error('[SupabaseDB] clearDuplicateFlag error:', error);
    throw new Error(`Failed to clear duplicate flag: ${error.message}`);
  }
  return true;
}

/** Get unresolved duplicates older than given hours */
export async function getUnresolvedDuplicates(olderThanHours: number): Promise<Member[]> {
  const db = createServerSupabaseClient();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.from('members')
    .select('*')
    .not('potential_duplicate_of', 'is', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getUnresolvedDuplicates error:', error);
    return [];
  }
  return (data || []).map(row => mapRowToMember(row as unknown as Record<string, unknown>));
}

// ==================== Requests ====================

export async function addRequest(request: ConnectionRequest): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('requests').insert({
    id: request.id,
    requester_id: request.requester_id,
    request_text: request.request_text,
    matched_ids: request.matched_ids,
    selected_id: request.selected_id ?? null,
    status: request.status,
    created_at: request.created_at,
    category: request.category ?? null,
    custom_intro_text: request.custom_intro_text ?? null,
  });
  if (error) {
    console.error('[SupabaseDB] addRequest error:', error);
    throw new Error(`Failed to add request: ${error.message}`);
  }
}

export async function getRequestById(id: string): Promise<ConnectionRequest | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('requests').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getRequestById error:', error);
    throw new Error(`Failed to get request by id: ${error.message}`);
  }
  return data ? mapRowToConnectionRequest(data as unknown as Record<string, unknown>) : null;
}

export async function getRequestsByMemberId(memberId: string): Promise<ConnectionRequest[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('requests').select('*')
    .eq('requester_id', memberId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getRequestsByMemberId error:', error);
    throw new Error(`Failed to get requests by member id: ${error.message}`);
  }
  return (data || []).map(row => mapRowToConnectionRequest(row as unknown as Record<string, unknown>));
}

export async function updateRequestStatus(
  id: string,
  status: ConnectionRequest['status'],
  selectedId?: string
): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('requests').update({
    status,
    selected_id: selectedId ?? null,
  }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateRequestStatus error:', error);
    throw new Error(`Failed to update request status: ${error.message}`);
  }
}

export async function updateRequestMatchedIds(id: string, matchedIds: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('requests').update({ matched_ids: matchedIds }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateRequestMatchedIds error:', error);
    throw new Error(`Failed to update matched ids: ${error.message}`);
  }
}

// ==================== Connections ====================

export async function addConnection(connection: Connection): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('connections').insert({
    id: connection.id,
    request_id: connection.request_id,
    from_id: connection.from_id,
    to_id: connection.to_id,
    intro_sent: connection.intro_sent,
    feedback: connection.feedback ?? null,
    created_at: connection.created_at,
  });
  if (error) {
    console.error('[SupabaseDB] addConnection error:', error);
    throw new Error(`Failed to add connection: ${error.message}`);
  }
}

export async function getConnectionsByTargetId(targetId: string): Promise<Connection[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('connections').select('*')
    .eq('to_id', targetId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getConnectionsByTargetId error:', error);
    throw new Error(`Failed to get connections by target id: ${error.message}`);
  }
  return (data || []).map(row => mapRowToConnection(row as unknown as Record<string, unknown>));
}

export async function areMembersConnected(memberA: string, memberB: string): Promise<boolean> {
  const db = createServerSupabaseClient();

  // Check 1: accepted contact_requests
  const { data: contactData, error: contactError } = await db.from('contact_requests')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${memberA},target_id.eq.${memberB}),and(requester_id.eq.${memberB},target_id.eq.${memberA})`)
    .limit(1);

  if (!contactError && contactData && contactData.length > 0) return true;

  // Check 2: existing connections row
  const { data: connData, error: connError } = await db.from('connections')
    .select('id')
    .or(`and(from_id.eq.${memberA},to_id.eq.${memberB}),and(from_id.eq.${memberB},to_id.eq.${memberA})`)
    .limit(1);

  if (!connError && connData && connData.length > 0) return true;

  return false;
}

// ==================== Audit ====================

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
    const db = createServerSupabaseClient();
    const { error } = await db.from('request_audits').insert({
      id: audit.id,
      member_id: audit.member_id,
      request_id: audit.request_id ?? null,
      ip_address: audit.ip_address,
      user_agent: audit.user_agent,
      timestamp: audit.timestamp,
      success: audit.success,
      failure_reason: audit.failure_reason ?? null,
      request_type: audit.request_type,
    });
    if (error) {
      console.error('[SupabaseDB] addRequestAudit error:', error);
    }
  } catch (error) {
    console.error('Failed to add request audit:', error);
  }
}

// ==================== LoveMatchRequests ====================

export async function createLoveMatchRequest(data: LoveMatchRequest): Promise<void> {
  const db = createServerSupabaseClient();
  const fromProfileParsed = typeof data.from_profile_shared === 'string'
    ? JSON.parse(data.from_profile_shared)
    : data.from_profile_shared;
  const toProfileParsed = data.to_profile_shared != null
    ? (typeof data.to_profile_shared === 'string' ? JSON.parse(data.to_profile_shared) : data.to_profile_shared)
    : null;

  const { error } = await db.from('love_match_requests').insert({
    id: data.id,
    request_id: data.request_id,
    from_id: data.from_id,
    to_id: data.to_id,
    status: data.status,
    from_profile_shared: fromProfileParsed,
    to_profile_shared: toProfileParsed,
    viewed_at: data.viewed_at ?? null,
    resolved_at: data.resolved_at ?? null,
    created_at: data.created_at,
  });
  if (error) {
    console.error('[SupabaseDB] createLoveMatchRequest error:', error);
    throw new Error(`Failed to create love match request: ${error.message}`);
  }
}

export async function getLoveMatchRequestsByUserId(userId: string): Promise<LoveMatchRequest[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('love_match_requests').select('*')
    .or(`from_id.eq.${userId},to_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getLoveMatchRequestsByUserId error:', error);
    throw new Error(`Failed to get love match requests: ${error.message}`);
  }
  return (data || []).map(row => mapRowToLoveMatchRequest(row as unknown as Record<string, unknown>));
}

export async function getLoveMatchRequestById(id: string): Promise<LoveMatchRequest | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('love_match_requests').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getLoveMatchRequestById error:', error);
    throw new Error(`Failed to get love match request by id: ${error.message}`);
  }
  return data ? mapRowToLoveMatchRequest(data as unknown as Record<string, unknown>) : null;
}

export async function updateLoveMatchRequest(
  id: string,
  updates: Partial<Pick<LoveMatchRequest, 'status' | 'viewed_at' | 'resolved_at'>>
): Promise<boolean> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('love_match_requests').update(updates).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateLoveMatchRequest error:', error);
    throw new Error(`Failed to update love match request: ${error.message}`);
  }
  return true;
}

// ==================== Contact Requests ====================

function mapRowToContactRequest(row: Record<string, unknown>): ContactRequest {
  return {
    id: row.id as string,
    requester_id: row.requester_id as string,
    target_id: row.target_id as string,
    message: row.message as string,
    status: (row.status as ContactRequest['status']) || 'pending',
    feedback: nullToUndefined(row.feedback as string | null),
    token: row.token as string,
    created_at: row.created_at as string,
    responded_at: nullToUndefined(row.responded_at as string | null),
    source: nullToUndefined(row.source as ContactRequest['source'] | null),
    connection_request_id: nullToUndefined(row.connection_request_id as string | null),
  };
}

export async function createContactRequest(data: ContactRequest): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('contact_requests').insert({
    id: data.id,
    requester_id: data.requester_id,
    target_id: data.target_id,
    message: data.message,
    status: data.status,
    feedback: data.feedback ?? null,
    token: data.token,
    created_at: data.created_at,
    responded_at: data.responded_at ?? null,
    source: data.source ?? 'direct',
    connection_request_id: data.connection_request_id ?? null,
  });
  if (error) {
    console.error('[SupabaseDB] createContactRequest error:', error);
    throw new Error(`Failed to create contact request: ${error.message}`);
  }
}

export async function getContactRequestByToken(token: string): Promise<ContactRequest | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('contact_requests').select('*').eq('token', token).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getContactRequestByToken error:', error);
    throw new Error(`Failed to get contact request: ${error.message}`);
  }
  return data ? mapRowToContactRequest(data as unknown as Record<string, unknown>) : null;
}

export async function getContactRequestsByMemberId(memberId: string): Promise<ContactRequest[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('contact_requests').select('*')
    .or(`requester_id.eq.${memberId},target_id.eq.${memberId}`)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getContactRequestsByMemberId error:', error);
    throw new Error(`Failed to get contact requests: ${error.message}`);
  }
  return (data || []).map(row => mapRowToContactRequest(row as unknown as Record<string, unknown>));
}

export async function updateContactRequestStatus(
  id: string,
  status: ContactRequest['status'],
  feedback?: string
): Promise<boolean> {
  const db = createServerSupabaseClient();
  const updates: Record<string, unknown> = {
    status,
    responded_at: new Date().toISOString(),
  };
  if (feedback !== undefined) updates.feedback = feedback;
  const { error } = await db.from('contact_requests').update(updates).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updateContactRequestStatus error:', error);
    throw new Error(`Failed to update contact request: ${error.message}`);
  }

  // Scoring hook: score accepted connection
  if (status === 'accepted') {
    try {
      const { data: request } = await db.from('contact_requests').select('target_id').eq('id', id).single();
      if (request) {
        const { scoreConnectionAccepted } = await import('@/lib/scoring');
        await scoreConnectionAccepted(id, (request as Record<string, unknown>).target_id as string);
      }
    } catch (err) {
      console.error('[scoring] Connection accepted scoring failed:', err);
    }
  }

  return true;
}

export async function getContactRequestsByRequesterAndTarget(
  requesterId: string,
  targetId: string
): Promise<ContactRequest[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('contact_requests').select('*')
    .eq('requester_id', requesterId)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getContactRequestsByRequesterAndTarget error:', error);
    return [];
  }
  return (data || []).map(row => mapRowToContactRequest(row as unknown as Record<string, unknown>));
}

export async function countTodayContactRequests(requesterId: string): Promise<number> {
  const db = createServerSupabaseClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count, error } = await db.from('contact_requests')
    .select('*', { count: 'exact', head: true })
    .eq('requester_id', requesterId)
    .gte('created_at', todayStart.toISOString());
  if (error) {
    console.error('[SupabaseDB] countTodayContactRequests error:', error);
    return 0;
  }
  return count || 0;
}

// ==================== Payment Records ====================

function mapRowToPaymentRecord(row: Record<string, unknown>): PaymentRecord {
  return {
    id: row.id as string,
    member_id: row.member_id as string,
    amount_vnd: (row.amount_vnd as number) || 0,
    admin_id: row.admin_id as string,
    notes: nullToUndefined(row.notes as string | null),
    created_at: row.created_at as string,
  };
}

export async function createPaymentRecord(data: PaymentRecord): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('payment_records').insert({
    id: data.id,
    member_id: data.member_id,
    amount_vnd: data.amount_vnd,
    admin_id: data.admin_id,
    notes: data.notes ?? null,
    created_at: data.created_at,
  });
  if (error) {
    console.error('[SupabaseDB] createPaymentRecord error:', error);
    throw new Error(`Failed to create payment record: ${error.message}`);
  }
}

export async function getPaymentRecords(): Promise<PaymentRecord[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('payment_records').select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getPaymentRecords error:', error);
    throw new Error(`Failed to get payment records: ${error.message}`);
  }
  return (data || []).map(row => mapRowToPaymentRecord(row as unknown as Record<string, unknown>));
}

export async function deletePaymentRecord(id: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('payment_records').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseDB] deletePaymentRecord error:', error);
    throw new Error(`Failed to delete payment record: ${error.message}`);
  }
}

export async function updatePaymentRecord(id: string, updates: { amount_vnd?: number; notes?: string }): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('payment_records').update(updates).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] updatePaymentRecord error:', error);
    throw new Error(`Failed to update payment record: ${error.message}`);
  }
}

// ==================== Member Search Counter ====================

export async function incrementMemberSearchCount(id: string): Promise<void> {
  const member = await getMemberById(id);
  if (!member) return;
  const db = createServerSupabaseClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const existingMonth = member.search_month_reset_date || '';

  const newCount = existingMonth === currentMonth
    ? (member.searches_this_month || 0) + 1
    : 1;

  const { error } = await db.from('members').update({
    searches_this_month: newCount,
    search_month_reset_date: currentMonth,
  }).eq('id', id);
  if (error) {
    console.error('[SupabaseDB] incrementMemberSearchCount error:', error);
  }
}

// ==================== News ====================

// Admin: get all articles (published + drafts)
export async function getAllNewsArticles(filters?: {
  category?: string;
  search?: string;
}): Promise<NewsArticle[]> {
  const db = createServerSupabaseClient();
  let query = db.from('news').select('*').order('created_at', { ascending: false });
  if (filters?.category && filters.category !== 'All') {
    query = query.eq('category', filters.category);
  }
  if (filters?.search) {
    const safe = filters.search.replace(/[%_'\\]/g, '\\$&');
    query = query.or(`title.ilike.%${safe}%,title_vi.ilike.%${safe}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Failed to get all news: ${error.message}`);
  return (data || []).map(row => mapRowToNewsArticle(row as unknown as Record<string, unknown>));
}

export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('news').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to get news by id: ${error.message}`);
  return data ? mapRowToNewsArticle(data as unknown as Record<string, unknown>) : null;
}

export async function createNewsArticle(article: Omit<NewsArticle, 'created_at'>): Promise<NewsArticle> {
  const db = createServerSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    ...article,
    image_url: article.image_url ?? null,
    title_vi: article.title_vi ?? null,
    excerpt_vi: article.excerpt_vi ?? null,
    content_vi: article.content_vi ?? null,
    created_at: new Date().toISOString(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('news') as any).insert(payload).select().single();

  if (
    error &&
    'tagged_member_ids' in payload &&
    /column.*tagged_member_ids/i.test(error.message)
  ) {
    throw new Error(
      'Cannot save tagged members: run migration 040_news_tagged_members.sql in Supabase first.'
    );
  }

  if (error) throw new Error(`Failed to create news: ${error.message}`);
  return mapRowToNewsArticle(data as unknown as Record<string, unknown>);
}

export async function updateNewsArticle(id: string, updates: Partial<Omit<NewsArticle, 'id' | 'created_at'>>): Promise<NewsArticle> {
  const db = createServerSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = { ...updates };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from('news') as any).update(payload).eq('id', id).select().single();

  // If the tagged_member_ids column hasn't been migrated yet, retry without it
  // so the admin can still save the rest of the article.
  if (
    error &&
    'tagged_member_ids' in payload &&
    /column.*tagged_member_ids/i.test(error.message)
  ) {
    throw new Error(
      'Cannot save tagged members: run migration 040_news_tagged_members.sql in Supabase first.'
    );
  }

  if (error) throw new Error(`Failed to update news: ${error.message}`);
  return mapRowToNewsArticle(data as unknown as Record<string, unknown>);
}

export async function deleteNewsArticle(id: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('news').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete news: ${error.message}`);
}

export async function getNewsArticles(category?: string, locale: string = 'vi'): Promise<NewsArticle[]> {
  const db = createServerSupabaseClient();
  const publishField = locale === 'en' ? 'is_published_en' : 'is_published_vi';
  let query = db.from('news').select('*').eq(publishField, true).order('published_date', { ascending: false });
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error) {
    console.error('[SupabaseDB] getNewsArticles error:', error);
    throw new Error(`Failed to get news articles: ${error.message}`);
  }
  return (data || []).map(row => mapRowToNewsArticle(row as unknown as Record<string, unknown>));
}

export async function getNewsArticleBySlug(slug: string, locale: string = 'vi'): Promise<NewsArticle | null> {
  const db = createServerSupabaseClient();
  const publishField = locale === 'en' ? 'is_published_en' : 'is_published_vi';
  const { data, error } = await db.from('news').select('*')
    .eq('slug', slug)
    .eq(publishField, true)
    .maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getNewsArticleBySlug error:', error);
    throw new Error(`Failed to get news article by slug: ${error.message}`);
  }
  return data ? mapRowToNewsArticle(data as unknown as Record<string, unknown>) : null;
}

// ==================== Bug Reports ====================

function mapRowToBugReport(row: Record<string, unknown>): BugReport {
  return {
    id: row.id as string,
    reporter_email: row.reporter_email as string,
    page_url: row.page_url as string,
    description: row.description as string,
    screenshot_url: nullToUndefined(row.screenshot_url as string | null),
    status: (row.status as BugReport['status']) || 'open',
    created_at: row.created_at as string,
  };
}

export async function createBugReport(report: BugReport): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('bug_reports').insert({
    id: report.id,
    reporter_email: report.reporter_email,
    page_url: report.page_url,
    description: report.description,
    screenshot_url: report.screenshot_url ?? null,
    status: report.status,
    created_at: report.created_at,
  });
  if (error) {
    console.error('[SupabaseDB] createBugReport error:', error);
    throw new Error(`Failed to create bug report: ${error.message}`);
  }
}

export async function getOpenBugReports(): Promise<BugReport[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('bug_reports').select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[SupabaseDB] getOpenBugReports error:', error);
    throw new Error(`Failed to get open bug reports: ${error.message}`);
  }
  return (data || []).map(row => mapRowToBugReport(row as unknown as Record<string, unknown>));
}

// ==================== ABG Classes ====================

function mapRowToAbgClass(row: Record<string, unknown>): AbgClass {
  return {
    id: row.id as string,
    name: row.name as string,
    display_order: (row.display_order as number) || 0,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
  };
}

export async function getAbgClasses(activeOnly = true): Promise<AbgClass[]> {
  const db = createServerSupabaseClient();
  let query = db.from('abg_classes').select('*').order('display_order');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    console.error('[SupabaseDB] getAbgClasses error:', error);
    throw new Error(`Failed to get ABG classes: ${error.message}`);
  }
  return (data || []).map(row => mapRowToAbgClass(row as unknown as Record<string, unknown>));
}

export async function createAbgClass(name: string, displayOrder: number): Promise<AbgClass> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('abg_classes').insert({
    name,
    display_order: displayOrder,
  }).select().single();
  if (error) {
    console.error('[SupabaseDB] createAbgClass error:', error);
    if (error.code === '23505') {
      throw new Error('A class with this name already exists');
    }
    throw new Error(`Failed to create ABG class: ${error.message}`);
  }
  return mapRowToAbgClass(data as unknown as Record<string, unknown>);
}

export async function updateAbgClass(id: string, updates: Partial<Pick<AbgClass, 'name' | 'display_order' | 'is_active'>>): Promise<AbgClass> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('abg_classes').update(updates).eq('id', id).select().single();
  if (error) {
    console.error('[SupabaseDB] updateAbgClass error:', error);
    throw new Error(`Failed to update ABG class: ${error.message}`);
  }
  return mapRowToAbgClass(data as unknown as Record<string, unknown>);
}

export async function deleteAbgClass(id: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from('abg_classes').delete().eq('id', id);
  if (error) {
    console.error('[SupabaseDB] deleteAbgClass error:', error);
    throw new Error(`Failed to delete ABG class: ${error.message}`);
  }
}

// Remap: update all members with oldClass to newClass
export async function remapMemberClass(oldClass: string, newClass: string): Promise<number> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members')
    .update({ abg_class: newClass })
    .eq('abg_class', oldClass)
    .select('id');
  if (error) {
    console.error('[SupabaseDB] remapMemberClass error:', error);
    throw new Error(`Failed to remap class: ${error.message}`);
  }
  return data?.length || 0;
}

// Get distinct abg_class values from members that don't match any canonical class
export async function getUnmappedClasses(): Promise<{ class_name: string; member_count: number }[]> {
  const db = createServerSupabaseClient();
  // Get canonical class names
  const { data: canonical, error: canonicalError } = await db.from('abg_classes').select('name');
  if (canonicalError) {
    console.error('[SupabaseDB] getUnmappedClasses canonical error:', canonicalError);
    throw new Error(`Failed to get canonical classes: ${canonicalError.message}`);
  }
  const canonicalNames = new Set((canonical || []).map(c => c.name));

  // Get all distinct abg_class values from members
  const { data: members, error: membersError } = await db.from('members').select('abg_class');
  if (membersError) {
    console.error('[SupabaseDB] getUnmappedClasses members error:', membersError);
    throw new Error(`Failed to get member classes: ${membersError.message}`);
  }
  const classCounts = new Map<string, number>();
  for (const m of members || []) {
    const cls = m.abg_class as string | null;
    if (cls && !canonicalNames.has(cls)) {
      classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
    }
  }

  return Array.from(classCounts.entries())
    .map(([class_name, member_count]) => ({ class_name, member_count }))
    .sort((a, b) => b.member_count - a.member_count);
}

// ==================== Admin Emails ====================

/** Get emails of all approved members with is_admin=true */
export async function getAdminEmails(): Promise<string[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('members')
    .select('email')
    .eq('is_admin', true)
    .eq('approval_status', 'approved');
  if (error) {
    console.error('[SupabaseDB] getAdminEmails error:', error);
    return [];
  }
  return (data || []).map(r => r.email as string);
}

/** Get IDs of all approved members with is_admin=true */
export async function getAdminMemberIds(): Promise<string[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('members')
    .select('id')
    .eq('is_admin', true)
    .eq('approval_status', 'approved');
  if (error) {
    console.error('[SupabaseDB] getAdminMemberIds error:', error);
    return [];
  }
  return (data || []).map(r => r.id as string);
}
