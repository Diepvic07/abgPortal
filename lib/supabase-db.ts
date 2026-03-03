import { createServerSupabaseClient } from './supabase/server';
import { Member, ConnectionRequest, Connection, LoveMatchRequest, NewsArticle, NewsCategory } from '@/types';

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
    voice_url: nullToUndefined(row.voice_url as string | null),
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
    discord_username: nullToUndefined(row.discord_username as string | null),
    payment_status: ((row.payment_status as string) || 'unpaid') as 'unpaid' | 'pending' | 'paid' | 'expired',
    membership_expiry: nullToUndefined(row.membership_expiry as string | null),
    approval_status: ((row.approval_status as string) || 'approved') as 'pending' | 'approved' | 'rejected',
    is_csv_imported: (row.is_csv_imported as boolean) || false,
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
    is_published: (row.is_published as boolean) || false,
    is_featured: (row.is_featured as boolean) || false,
    created_at: row.created_at as string,
    title_vi: nullToUndefined(row.title_vi as string | null),
    excerpt_vi: nullToUndefined(row.excerpt_vi as string | null),
    content_vi: nullToUndefined(row.content_vi as string | null),
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

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('members').select('*').ilike('email', email).maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getMemberByEmail error:', error);
    throw new Error(`Failed to get member by email: ${error.message}`);
  }
  return data ? mapRowToMember(data as unknown as Record<string, unknown>) : null;
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
    voice_url: member.voice_url ?? null,
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
    discord_username: member.discord_username ?? null,
    payment_status: member.payment_status ?? 'unpaid',
    membership_expiry: member.membership_expiry ?? null,
    approval_status: member.approval_status ?? 'approved',
    is_csv_imported: member.is_csv_imported ?? false,
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

// ==================== News ====================

export async function getNewsArticles(category?: string): Promise<NewsArticle[]> {
  const db = createServerSupabaseClient();
  let query = db.from('news').select('*').eq('is_published', true).order('published_date', { ascending: false });
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

export async function getNewsArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db.from('news').select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (error) {
    console.error('[SupabaseDB] getNewsArticleBySlug error:', error);
    throw new Error(`Failed to get news article by slug: ${error.message}`);
  }
  return data ? mapRowToNewsArticle(data as unknown as Record<string, unknown>) : null;
}
