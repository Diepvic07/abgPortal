import { createServerSupabaseClient } from './supabase/server';
import { CommunityEvent, EventRsvp, EventComment, EventCategory, EventStatus, EventMode, CommitmentLevel, CommentStatus } from '@/types';
import { generateId, formatDate } from '@/lib/utils';

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

// ==================== Map Functions ====================

function mapRowToEvent(row: Record<string, unknown>): CommunityEvent {
  return {
    id: row.id as string,
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
    outcome_summary: nullToUndefined(row.outcome_summary as string | null),
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
  created_by_member_id: string;
  proposal_id?: string;
  status?: EventStatus;
}): Promise<CommunityEvent> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();
  const status = data.status || 'draft';

  const { data: row, error } = await supabase
    .from('community_events')
    .insert({
      id,
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
  image_url: string | null;
  status: EventStatus;
  published_at: string | null;
  completed_at: string | null;
  outcome_summary: string | null;
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
      status: 'visible',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event comment:', error);
    throw new Error('Failed to create comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function getEventComments(eventId: string): Promise<EventComment[]> {
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

  return (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToComment({
      ...row,
      member_name: members?.name || null,
      member_avatar_url: members?.avatar_url || null,
    });
  });
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
