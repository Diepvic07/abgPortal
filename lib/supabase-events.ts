import { createServerSupabaseClient } from './supabase/server';
import { CommunityEvent, EventRsvp, EventComment, EventGuestRsvp, EventPayment, EventCategory, EventStatus, EventMode, EventPaymentStatus, PayerType, CommitmentLevel, CommentStatus } from '@/types';
import { generateId, formatDate, generateSlug } from '@/lib/utils';

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

// ==================== Map Functions ====================

function mapRowToEvent(row: Record<string, unknown>): CommunityEvent {
  return {
    id: row.id as string,
    slug: (row.slug as string) || '',
    title: row.title as string,
    description: row.description as string,
    category: (row.category as EventCategory) || 'event',
    event_mode: nullToUndefined(row.event_mode as EventMode | null),
    event_date: row.event_date as string,
    event_end_date: nullToUndefined(row.event_end_date as string | null),
    location: nullToUndefined(row.location as string | null),
    location_url: nullToUndefined(row.location_url as string | null),
    capacity: nullToUndefined(row.capacity as number | null),
    capacity_premium: nullToUndefined(row.capacity_premium as number | null),
    capacity_basic: nullToUndefined(row.capacity_basic as number | null),
    image_url: nullToUndefined(row.image_url as string | null),
    created_by_member_id: row.created_by_member_id as string,
    proposal_id: nullToUndefined(row.proposal_id as string | null),
    status: (row.status as EventStatus) || 'draft',
    rsvp_count: (row.rsvp_count as number) || 0,
    rsvp_score: (row.rsvp_score as number) || 0,
    comment_count: (row.comment_count as number) || 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    published_at: nullToUndefined(row.published_at as string | null),
    completed_at: nullToUndefined(row.completed_at as string | null),
    fee_premium: nullToUndefined(row.fee_premium as number | null),
    fee_basic: nullToUndefined(row.fee_basic as number | null),
    fee_guest: nullToUndefined(row.fee_guest as number | null),
    capacity_guest: nullToUndefined(row.capacity_guest as number | null),
    is_public: (row.is_public as boolean) || false,
    payment_qr_url: nullToUndefined(row.payment_qr_url as string | null),
    payment_instructions: nullToUndefined(row.payment_instructions as string | null),
    payment_code: nullToUndefined(row.payment_code as string | null),
    guest_rsvp_count: (row.guest_rsvp_count as number) || 0,
    outcome_summary: nullToUndefined(row.outcome_summary as string | null),
    registration_deadline: nullToUndefined(row.registration_deadline as string | null),
    allow_cancellation: (row.allow_cancellation as boolean) ?? true,
    require_question: (row.require_question as boolean) || false,
    question_prompt: nullToUndefined(row.question_prompt as string | null),
    author_name: nullToUndefined(row.author_name as string | null),
    author_avatar_url: nullToUndefined(row.author_avatar_url as string | null),
    author_abg_class: nullToUndefined(row.author_abg_class as string | null),
  };
}

function mapRowToRsvp(row: Record<string, unknown>): EventRsvp {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    member_id: row.member_id as string,
    commitment_level: (row.commitment_level as CommitmentLevel) || 'interested',
    note: nullToUndefined(row.note as string | null),
    actual_attendance: nullToUndefined(row.actual_attendance as boolean | null),
    actual_participation_score: nullToUndefined(row.actual_participation_score as number | null),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_name: nullToUndefined(row.member_name as string | null),
    member_avatar_url: nullToUndefined(row.member_avatar_url as string | null),
    member_abg_class: nullToUndefined(row.member_abg_class as string | null),
  };
}

function mapRowToComment(row: Record<string, unknown>): EventComment {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    member_id: row.member_id as string,
    body: row.body as string,
    status: (row.status as CommentStatus) || 'visible',
    parent_comment_id: nullToUndefined(row.parent_comment_id as string | null),
    image_url: nullToUndefined(row.image_url as string | null),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_name: nullToUndefined(row.member_name as string | null),
    member_avatar_url: nullToUndefined(row.member_avatar_url as string | null),
  };
}

// ==================== Events ====================

export async function createEvent(data: {
  title: string;
  description: string;
  category: EventCategory;
  event_mode?: EventMode;
  event_date: string;
  event_end_date?: string;
  location?: string;
  location_url?: string;
  capacity?: number;
  capacity_premium?: number;
  capacity_basic?: number;
  image_url?: string;
  fee_premium?: number;
  fee_basic?: number;
  fee_guest?: number;
  capacity_guest?: number;
  is_public?: boolean;
  payment_qr_url?: string;
  payment_instructions?: string;
  registration_deadline?: string;
  allow_cancellation?: boolean;
  created_by_member_id: string;
  proposal_id?: string;
  status?: EventStatus;
}): Promise<CommunityEvent> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();
  const status = data.status || 'draft';

  const slug = generateSlug(data.title);

  const { data: row, error } = await supabase
    .from('community_events')
    .insert({
      id,
      slug,
      title: data.title,
      description: data.description,
      category: data.category,
      event_mode: data.event_mode || 'offline',
      event_date: data.event_date,
      event_end_date: data.event_end_date || null,
      location: data.location || null,
      location_url: data.location_url || null,
      capacity: data.capacity || null,
      capacity_premium: data.capacity_premium ?? null,
      capacity_basic: data.capacity_basic ?? null,
      image_url: data.image_url || null,
      fee_premium: data.fee_premium ?? null,
      fee_basic: data.fee_basic ?? null,
      fee_guest: data.fee_guest ?? null,
      capacity_guest: data.capacity_guest ?? null,
      is_public: data.is_public || false,
      payment_qr_url: data.payment_qr_url || null,
      payment_instructions: data.payment_instructions || null,
      registration_deadline: data.registration_deadline || null,
      allow_cancellation: data.allow_cancellation ?? true,
      guest_rsvp_count: 0,
      created_by_member_id: data.created_by_member_id,
      proposal_id: data.proposal_id || null,
      status,
      rsvp_count: 0,
      rsvp_score: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      published_at: status === 'published' ? now : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }

  return mapRowToEvent(row as Record<string, unknown>);
}

export async function getEvents(options: {
  status?: EventStatus;
  category?: EventCategory;
  upcoming?: boolean;
  past?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ events: CommunityEvent[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const page = options.page || 1;
  const limit = options.limit || 10;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)', { count: 'exact' });

  if (options.status) {
    query = query.eq('status', options.status);
  } else {
    query = query.neq('status', 'cancelled');
  }

  if (options.category) {
    query = query.eq('category', options.category);
  }

  const now = formatDate();
  if (options.upcoming) {
    query = query.gte('event_date', now).eq('status', 'published');
    query = query.order('event_date', { ascending: true });
  } else if (options.past) {
    query = query.eq('status', 'completed');
    query = query.order('event_date', { ascending: false });
  } else {
    query = query.order('event_date', { ascending: true });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: rows, error, count } = await query;

  if (error) {
    console.error('Error fetching events:', error);
    throw new Error('Failed to fetch events');
  }

  const events = (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToEvent({
      ...row,
      author_name: members?.name || null,
      author_avatar_url: members?.avatar_url || null,
      author_abg_class: members?.abg_class || null,
    });
  });

  return { events, total: count || 0 };
}

export async function getEventById(id: string): Promise<CommunityEvent | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event:', error);
    throw new Error('Failed to fetch event');
  }

  if (!row) return null;

  const members = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToEvent({
    ...(row as Record<string, unknown>),
    author_name: members?.name || null,
    author_avatar_url: members?.avatar_url || null,
    author_abg_class: members?.abg_class || null,
  });
}

export async function getEventBySlug(slug: string): Promise<CommunityEvent | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event by slug:', error);
    throw new Error('Failed to fetch event');
  }

  if (!row) return null;

  const members = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToEvent({
    ...(row as Record<string, unknown>),
    author_name: members?.name || null,
    author_avatar_url: members?.avatar_url || null,
    author_abg_class: members?.abg_class || null,
  });
}

export async function updateEvent(id: string, data: Partial<{
  title: string;
  description: string;
  category: EventCategory;
  event_mode: EventMode | null;
  event_date: string;
  event_end_date: string | null;
  location: string | null;
  location_url: string | null;
  capacity: number | null;
  capacity_premium: number | null;
  capacity_basic: number | null;
  capacity_guest: number | null;
  image_url: string | null;
  status: EventStatus;
  published_at: string | null;
  completed_at: string | null;
  outcome_summary: string | null;
  fee_premium: number | null;
  fee_basic: number | null;
  fee_guest: number | null;
  is_public: boolean;
  allow_cancellation: boolean;
  registration_deadline: string | null;
  payment_qr_url: string | null;
  payment_instructions: string | null;
}>): Promise<CommunityEvent> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .update({ ...data, updated_at: formatDate() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }

  return mapRowToEvent(row as Record<string, unknown>);
}

// ==================== RSVPs ====================

export async function upsertRsvp(data: {
  event_id: string;
  member_id: string;
  commitment_level: CommitmentLevel;
  note?: string;
}): Promise<EventRsvp> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const { data: existing } = await supabase
    .from('community_event_rsvps')
    .select('id')
    .eq('event_id', data.event_id)
    .eq('member_id', data.member_id)
    .maybeSingle();

  if (existing) {
    const { data: row, error } = await supabase
      .from('community_event_rsvps')
      .update({ commitment_level: data.commitment_level, note: data.note || null, updated_at: now })
      .eq('id', (existing as Record<string, unknown>).id as string)
      .select()
      .single();

    if (error) {
      console.error('Error updating RSVP:', error);
      throw new Error('Failed to update RSVP');
    }
    return mapRowToRsvp(row as Record<string, unknown>);
  }

  const { data: row, error } = await supabase
    .from('community_event_rsvps')
    .insert({
      id: generateId(),
      event_id: data.event_id,
      member_id: data.member_id,
      commitment_level: data.commitment_level,
      note: data.note || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating RSVP:', error);
    throw new Error('Failed to create RSVP');
  }

  return mapRowToRsvp(row as Record<string, unknown>);
}

export async function removeRsvp(eventId: string, memberId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_event_rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId);

  if (error) {
    console.error('Error removing RSVP:', error);
    throw new Error('Failed to remove RSVP');
  }
}

export async function getRsvpsByEvent(eventId: string): Promise<EventRsvp[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('community_event_rsvps')
    .select('*, members!community_event_rsvps_member_id_fkey(name, avatar_url, abg_class)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching RSVPs:', error);
    throw new Error('Failed to fetch RSVPs');
  }

  return (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToRsvp({
      ...row,
      member_name: members?.name || null,
      member_avatar_url: members?.avatar_url || null,
      member_abg_class: members?.abg_class || null,
    });
  });
}

export async function getMemberRsvp(eventId: string, memberId: string): Promise<EventRsvp | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_event_rsvps')
    .select()
    .eq('event_id', eventId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching RSVP:', error);
    return null;
  }

  if (!row) return null;
  return mapRowToRsvp(row as Record<string, unknown>);
}

// ==================== Comments ====================

export async function createEventComment(data: {
  event_id: string;
  member_id: string;
  body: string;
  parent_comment_id?: string;
  image_url?: string;
}): Promise<EventComment> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('community_event_comments')
    .insert({
      id: generateId(),
      event_id: data.event_id,
      member_id: data.member_id,
      body: data.body,
      parent_comment_id: data.parent_comment_id || null,
      status: 'visible',
      created_at: now,
      updated_at: now,
      ...(data.image_url ? { image_url: data.image_url } : {}),
    } as never)
    .select()
    .single();

  if (error) {
    console.error('Error creating event comment:', error);
    throw new Error('Failed to create comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function getEventComments(eventId: string, currentMemberId?: string): Promise<EventComment[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('community_event_comments')
    .select('*, members!community_event_comments_member_id_fkey(name, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching event comments:', error);
    throw new Error('Failed to fetch comments');
  }

  const allComments = (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToComment({
      ...row,
      member_name: members?.name || null,
      member_avatar_url: members?.avatar_url || null,
    });
  });

  // Fetch reactions for all comments
  const commentIds = allComments.map(c => c.id);
  const { getReactionSummaries } = await import('@/lib/supabase-reactions');
  const reactions = await getReactionSummaries(commentIds, 'event', currentMemberId);

  // Build threaded structure
  const topLevel: EventComment[] = [];
  const repliesByParent: Record<string, EventComment[]> = {};

  for (const comment of allComments) {
    comment.reactions = reactions[comment.id];
    if (comment.parent_comment_id) {
      if (!repliesByParent[comment.parent_comment_id]) {
        repliesByParent[comment.parent_comment_id] = [];
      }
      repliesByParent[comment.parent_comment_id].push(comment);
    } else {
      topLevel.push(comment);
    }
  }

  for (const comment of topLevel) {
    comment.replies = repliesByParent[comment.id] || [];
  }

  return topLevel;
}

export async function updateEventComment(commentId: string, body: string): Promise<EventComment> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_event_comments')
    .update({ body, updated_at: formatDate() })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating event comment:', error);
    throw new Error('Failed to update comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}

export async function deleteEventComment(commentId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_event_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting event comment:', error);
    throw new Error('Failed to delete comment');
  }
}

// ==================== Admin: Create from Proposal ====================

export async function createEventFromProposal(proposalId: string, adminMemberId: string, eventData: {
  event_mode?: EventMode;
  event_date: string;
  event_end_date?: string;
  location?: string;
  location_url?: string;
  capacity?: number;
  capacity_premium?: number;
  capacity_basic?: number;
  image_url?: string;
}): Promise<CommunityEvent> {
  const supabase = createServerSupabaseClient();

  // Fetch the proposal
  const { data: proposal, error: proposalError } = await supabase
    .from('community_proposals')
    .select('id, title, description, category')
    .eq('id', proposalId)
    .single();

  if (proposalError || !proposal) {
    throw new Error('Proposal not found');
  }

  const p = proposal as Record<string, unknown>;

  // Create event
  const event = await createEvent({
    title: p.title as string,
    description: p.description as string,
    category: (p.category as EventCategory) || 'event',
    event_mode: eventData.event_mode || 'offline',
    event_date: eventData.event_date,
    event_end_date: eventData.event_end_date,
    location: eventData.location,
    location_url: eventData.location_url,
    capacity: eventData.capacity,
    image_url: eventData.image_url,
    created_by_member_id: adminMemberId,
    proposal_id: proposalId,
    status: 'draft',
  });

  // Bulk import commitments as RSVPs
  const { data: commitments } = await supabase
    .from('community_commitments')
    .select('member_id, commitment_level')
    .eq('proposal_id', proposalId);

  if (commitments && commitments.length > 0) {
    const now = formatDate();
    const rsvpRows = (commitments as Array<Record<string, unknown>>).map((c) => ({
      id: generateId(),
      event_id: event.id,
      member_id: c.member_id as string,
      commitment_level: c.commitment_level as string,
      created_at: now,
      updated_at: now,
    }));

    // Bulk insert with conflict handling
    const { error: rsvpError } = await supabase
      .from('community_event_rsvps')
      .upsert(rsvpRows, { onConflict: 'event_id,member_id', ignoreDuplicates: true });

    if (rsvpError) {
      console.error('Error importing RSVPs from proposal:', rsvpError);
      // Non-fatal: event was created, RSVPs just didn't import
    }
  }

  // Update proposal status to selected
  await supabase
    .from('community_proposals')
    .update({
      status: 'selected',
      selected_at: formatDate(),
      selected_by_member_id: adminMemberId,
      updated_at: formatDate(),
    })
    .eq('id', proposalId);

  // Re-fetch event to get updated counts from triggers
  const updated = await getEventById(event.id);
  return updated || event;
}

// ==================== Admin: Manage Attendance ====================

export async function updateRsvpAttendance(rsvpId: string, data: {
  actual_attendance: boolean;
  actual_participation_score?: number;
}): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_event_rsvps')
    .update({
      actual_attendance: data.actual_attendance,
      actual_participation_score: data.actual_participation_score || null,
      updated_at: formatDate(),
    })
    .eq('id', rsvpId);

  if (error) {
    console.error('Error updating attendance:', error);
    throw new Error('Failed to update attendance');
  }
}

// ==================== Admin: Get All Events ====================

export async function getAllEvents(options?: {
  status?: EventStatus;
  category?: string;
  search?: string;
}): Promise<CommunityEvent[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.search) {
    query = query.ilike('title', `%${options.search}%`);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching all events:', error);
    throw new Error('Failed to fetch events');
  }

  return (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToEvent({
      ...row,
      author_name: members?.name || null,
      author_avatar_url: members?.avatar_url || null,
      author_abg_class: members?.abg_class || null,
    });
  });
}

// ==================== Get Event by Proposal ====================

export async function getEventByProposalId(proposalId: string): Promise<CommunityEvent | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('proposal_id', proposalId)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (error) {
    console.error('Error fetching event by proposal:', error);
    return null;
  }

  if (!row) return null;

  const members = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToEvent({
    ...(row as Record<string, unknown>),
    author_name: members?.name || null,
    author_avatar_url: members?.avatar_url || null,
    author_abg_class: members?.abg_class || null,
  });
}

// ==================== Public Events (no auth) ====================

export async function getPublicEvents(options?: {
  page?: number;
  limit?: number;
  upcoming?: boolean;
  past?: boolean;
}): Promise<{ events: CommunityEvent[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;
  const now = formatDate();

  let query = supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)', { count: 'exact' })
    .eq('status', 'published');

  if (options?.past) {
    query = query.lt('event_date', now).order('event_date', { ascending: false });
  } else {
    // Default to upcoming
    query = query.gte('event_date', now).order('event_date', { ascending: true });
  }

  const { data: rows, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching public events:', error);
    throw new Error('Failed to fetch public events');
  }

  const events = (rows || []).map((row: Record<string, unknown>) => {
    const m = row.members as Record<string, unknown> | null;
    return mapRowToEvent({
      ...row,
      author_name: m?.name || null,
      author_avatar_url: m?.avatar_url || null,
      author_abg_class: m?.abg_class || null,
    });
  });

  return { events, total: count || 0 };
}

export async function getPublicEventById(eventId: string): Promise<CommunityEvent | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('id', eventId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching public event:', error);
    return null;
  }
  if (!row) return null;

  const m = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToEvent({
    ...(row as Record<string, unknown>),
    author_name: m?.name || null,
    author_avatar_url: m?.avatar_url || null,
    author_abg_class: m?.abg_class || null,
  });
}

export async function getPublicEventBySlug(slug: string): Promise<CommunityEvent | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_events')
    .select('*, members!community_events_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching public event by slug:', error);
    return null;
  }
  if (!row) return null;

  const m = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToEvent({
    ...(row as Record<string, unknown>),
    author_name: m?.name || null,
    author_avatar_url: m?.avatar_url || null,
    author_abg_class: m?.abg_class || null,
  });
}

// ==================== Guest RSVPs ====================

function mapRowToGuestRsvp(row: Record<string, unknown>): EventGuestRsvp {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    guest_name: row.guest_name as string,
    guest_email: row.guest_email as string,
    guest_phone: nullToUndefined(row.guest_phone as string | null),
    question: nullToUndefined(row.question as string | null),
    status: (row.status as EventGuestRsvp['status']) || 'registered',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createGuestRsvp(data: {
  event_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  question?: string;
}): Promise<EventGuestRsvp> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('event_guest_rsvps')
    .insert({
      id,
      event_id: data.event_id,
      guest_name: data.guest_name,
      guest_email: data.guest_email,
      guest_phone: data.guest_phone || null,
      question: data.question || null,
      status: 'registered',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already registered for this event');
    }
    console.error('Error creating guest RSVP:', error);
    throw new Error('Failed to register');
  }

  return mapRowToGuestRsvp(row as Record<string, unknown>);
}

export async function getGuestRsvpsByEvent(eventId: string): Promise<EventGuestRsvp[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('event_guest_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'registered')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching guest RSVPs:', error);
    throw new Error('Failed to fetch guest RSVPs');
  }

  return (rows || []).map((r: Record<string, unknown>) => mapRowToGuestRsvp(r));
}

export async function getGuestRsvpByEmail(eventId: string, email: string): Promise<EventGuestRsvp | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('event_guest_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('guest_email', email)
    .eq('status', 'registered')
    .maybeSingle();

  if (error) {
    console.error('Error checking guest RSVP:', error);
    return null;
  }

  return row ? mapRowToGuestRsvp(row as Record<string, unknown>) : null;
}

// ==================== Event Payments ====================

function mapRowToPayment(row: Record<string, unknown>): EventPayment {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    payer_type: row.payer_type as PayerType,
    member_id: nullToUndefined(row.member_id as string | null),
    guest_rsvp_id: nullToUndefined(row.guest_rsvp_id as string | null),
    amount_vnd: row.amount_vnd as number,
    status: (row.status as EventPaymentStatus) || 'pending',
    confirmed_by_admin_id: nullToUndefined(row.confirmed_by_admin_id as string | null),
    payer_name: row.payer_name as string,
    payer_email: row.payer_email as string,
    notes: nullToUndefined(row.notes as string | null),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function createEventPayment(data: {
  event_id: string;
  payer_type: PayerType;
  member_id?: string;
  guest_rsvp_id?: string;
  amount_vnd: number;
  payer_name: string;
  payer_email: string;
  notes?: string;
}): Promise<EventPayment> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('event_payments')
    .insert({
      id,
      event_id: data.event_id,
      payer_type: data.payer_type,
      member_id: data.member_id || null,
      guest_rsvp_id: data.guest_rsvp_id || null,
      amount_vnd: data.amount_vnd,
      status: 'pending',
      payer_name: data.payer_name,
      payer_email: data.payer_email,
      notes: data.notes || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event payment:', error);
    throw new Error('Failed to create payment record');
  }

  return mapRowToPayment(row as Record<string, unknown>);
}

export async function getEventPayments(eventId: string): Promise<EventPayment[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('event_payments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching event payments:', error);
    throw new Error('Failed to fetch event payments');
  }

  return (rows || []).map((r: Record<string, unknown>) => mapRowToPayment(r));
}

export async function updateEventPaymentStatus(paymentId: string, status: EventPaymentStatus, adminId?: string, amountVnd?: number): Promise<EventPayment> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const updateData: Record<string, unknown> = { status, updated_at: now };
  if (adminId) updateData.confirmed_by_admin_id = adminId;
  if (amountVnd != null) updateData.amount_vnd = amountVnd;

  const { data: row, error } = await supabase
    .from('event_payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
    throw new Error('Failed to update payment');
  }

  return mapRowToPayment(row as Record<string, unknown>);
}
