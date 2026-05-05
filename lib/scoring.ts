import { createServerSupabaseClient } from './supabase/server';
import { generateId, formatDate } from '@/lib/utils';

// ==================== Types ====================

interface ScoreEventParams {
  memberId: string;
  ruleKey: string;
  category: 'participation' | 'engagement';
  score: number;
  sourceType: string;
  sourceId: string;
  effectiveAt: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

interface PeriodBounds {
  periodType: 'month' | 'quarter' | 'year';
  periodStart: string;
  periodEnd: string;
}

interface LeaderboardPeriodOption {
  label: string;
  anchor: string;
  start: string;
  end: string;
}

// ==================== Constants ====================

const TIMEZONE = 'Asia/Ho_Chi_Minh';

const SCORE_RULES: Record<string, { category: 'participation' | 'engagement'; score: number }> = {
  'event.organizer.completed': { category: 'participation', score: 100 },
  'event.lead.completed': { category: 'participation', score: 80 },
  'event.attendee.offline.completed': { category: 'participation', score: 30 },
  'event.attendee.online.completed': { category: 'participation', score: 20 },
  'proposal.traction.reached': { category: 'participation', score: 20 },
  'proposal.converted_to_event': { category: 'participation', score: 30 },
  'reference.written': { category: 'participation', score: 20 },
  'connection.accepted': { category: 'participation', score: 10 },
  'comment.qualified': { category: 'engagement', score: 5 },
  'comment.reply.qualified': { category: 'engagement', score: 5 },
  'comment.reply.received': { category: 'engagement', score: 5 },
};

// Map rule_key prefix to the source-type breakdown column in member_score_periods
function getSourceColumn(ruleKey: string): string {
  if (ruleKey.startsWith('event.')) return 'event_score';
  if (ruleKey.startsWith('proposal.')) return 'proposal_score';
  if (ruleKey === 'reference.written') return 'reference_score';
  if (ruleKey === 'connection.accepted') return 'connection_score';
  if (ruleKey.startsWith('comment.')) return 'comment_score';
  return 'event_score';
}

// ==================== Period Computation ====================

function toTimezoneDate(isoString: string): Date {
  // Parse ISO string and convert to Asia/Ho_Chi_Minh for period bucketing
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  );
}

function formatPeriodDate(year: number, month: number, day: number): string {
  // Format as ISO-ish string with +07:00 offset
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}T00:00:00+07:00`;
}

export function computePeriodBounds(effectiveAt: string): PeriodBounds[] {
  const local = toTimezoneDate(effectiveAt);
  const year = local.getFullYear();
  const month = local.getMonth() + 1; // 1-based

  // Quarter: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const quarterEndMonth = quarterStartMonth + 3;
  const quarterEndYear = quarterEndMonth > 12 ? year + 1 : year;
  const quarterEndMonthNorm = quarterEndMonth > 12 ? quarterEndMonth - 12 : quarterEndMonth;

  // Month boundaries
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;

  return [
    {
      periodType: 'month',
      periodStart: formatPeriodDate(year, month, 1),
      periodEnd: formatPeriodDate(nextMonthYear, nextMonth, 1),
    },
    {
      periodType: 'quarter',
      periodStart: formatPeriodDate(year, quarterStartMonth, 1),
      periodEnd: formatPeriodDate(quarterEndYear, quarterEndMonthNorm, 1),
    },
    {
      periodType: 'year',
      periodStart: formatPeriodDate(year, 1, 1),
      periodEnd: formatPeriodDate(year + 1, 1, 1),
    },
  ];
}

function getPeriodLabel(periodType: 'month' | 'quarter' | 'year', anchorIso: string): string {
  const local = toTimezoneDate(anchorIso);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (periodType === 'month') {
    return `${monthNames[local.getMonth()]} ${local.getFullYear()}`;
  }

  if (periodType === 'quarter') {
    const q = Math.floor(local.getMonth() / 3) + 1;
    return `Q${q} ${local.getFullYear()}`;
  }

  return `${local.getFullYear()}`;
}

async function getAvailableLeaderboardPeriods(periodType: 'month' | 'quarter' | 'year'): Promise<LeaderboardPeriodOption[]> {
  const supabase = createServerSupabaseClient();
  const { data: rows } = await (supabase.from('member_score_periods') as any)
    .select('period_start, period_end')
    .eq('period_type', periodType)
    .gt('total_score', 0)
    .order('period_start', { ascending: false })
    .limit(1000);

  const periods = new Map<string, LeaderboardPeriodOption>();

  for (const row of (rows || []) as Array<Record<string, unknown>>) {
    const start = row.period_start as string;
    const end = row.period_end as string;
    if (!start || periods.has(start)) continue;

    const anchor = start.slice(0, 10);
    periods.set(start, {
      label: getPeriodLabel(periodType, start),
      anchor,
      start,
      end,
    });
  }

  return [...periods.values()];
}

// ==================== Core Write ====================

export async function writeScoreEvent(params: ScoreEventParams): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();
  const id = generateId();

  // If this member already has an active score for the same rule/source, no-op.
  // A reversed score can be applied again after an admin correction.
  const { data: existingActive } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('member_id', params.memberId)
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)
    .eq('rule_key', params.ruleKey)
    .eq('is_reversal', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActive) {
    const { data: reversal } = await (supabase.from('score_events') as any)
      .select('id')
      .eq('idempotency_key', `reversal:${(existingActive as Record<string, unknown>).id}`)
      .maybeSingle();

    if (!reversal) return null;
  }

  let idempotencyKey = params.idempotencyKey;
  const { data: existingKey } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingKey) {
    idempotencyKey = `${idempotencyKey}:reapply:${id}`;
  }

  // Insert score event
  const { error } = await (supabase.from('score_events') as any)
    .insert({
      id,
      member_id: params.memberId,
      rule_key: params.ruleKey,
      category: params.category,
      score: params.score,
      source_type: params.sourceType,
      source_id: params.sourceId,
      effective_at: params.effectiveAt,
      idempotency_key: idempotencyKey,
      is_reversal: false,
      reverses_score_event_id: null,
      metadata: params.metadata || {},
      created_at: now,
    });

  if (error) {
    // Unique constraint violation = already scored (race condition), treat as no-op
    if (error.code === '23505') return null;
    console.error('[scoring] Failed to write score event:', error);
    throw error;
  }

  // Update period aggregates
  await upsertPeriodAggregates(params.memberId, params.effectiveAt, params.score, params.category, params.ruleKey, now);

  return id;
}

export async function writeReversalEvent(originalScoreEventId: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  // Fetch original
  const { data: original } = await (supabase.from('score_events') as any)
    .select('*')
    .eq('id', originalScoreEventId)
    .single();

  if (!original) {
    console.error('[scoring] Original score event not found for reversal:', originalScoreEventId);
    return null;
  }

  // Check if already reversed
  const reversalKey = `reversal:${originalScoreEventId}`;
  const { data: existingReversal } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('idempotency_key', reversalKey)
    .maybeSingle();

  if (existingReversal) return null;

  const id = generateId();
  const { error } = await (supabase.from('score_events') as any)
    .insert({
      id,
      member_id: original.member_id,
      rule_key: original.rule_key,
      category: original.category,
      score: -original.score,
      source_type: original.source_type,
      source_id: original.source_id,
      effective_at: original.effective_at,
      idempotency_key: reversalKey,
      is_reversal: true,
      reverses_score_event_id: originalScoreEventId,
      metadata: { ...original.metadata, reversal_reason: 'state_change' },
      created_at: now,
    });

  if (error) {
    if (error.code === '23505') return null;
    console.error('[scoring] Failed to write reversal:', error);
    throw error;
  }

  // Update aggregates with negative delta
  await upsertPeriodAggregates(original.member_id, original.effective_at, -original.score, original.category, original.rule_key, now);

  return id;
}

async function upsertPeriodAggregates(
  memberId: string,
  effectiveAt: string,
  scoreDelta: number,
  category: string,
  ruleKey: string,
  now: string,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const periods = computePeriodBounds(effectiveAt);
  const sourceCol = getSourceColumn(ruleKey);
  const categoryCol = category === 'participation' ? 'participation_score' : 'engagement_score';

  for (const period of periods) {
    // Try to update existing row first
    const { data: existing } = await (supabase.from('member_score_periods') as any)
      .select('total_score, participation_score, engagement_score, event_score, proposal_score, reference_score, connection_score, comment_score')
      .eq('member_id', memberId)
      .eq('period_type', period.periodType)
      .eq('period_start', period.periodStart)
      .maybeSingle();

    if (existing) {
      const updates: Record<string, unknown> = {
        total_score: (existing.total_score || 0) + scoreDelta,
        [categoryCol]: (existing[categoryCol] || 0) + scoreDelta,
        [sourceCol]: (existing[sourceCol] || 0) + scoreDelta,
        last_scored_at: now,
        updated_at: now,
      };

      await (supabase.from('member_score_periods') as any)
        .update(updates)
        .eq('member_id', memberId)
        .eq('period_type', period.periodType)
        .eq('period_start', period.periodStart);
    } else {
      const row: Record<string, unknown> = {
        member_id: memberId,
        period_type: period.periodType,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        timezone: TIMEZONE,
        total_score: Math.max(0, scoreDelta),
        participation_score: 0,
        engagement_score: 0,
        event_score: 0,
        proposal_score: 0,
        reference_score: 0,
        connection_score: 0,
        comment_score: 0,
        last_scored_at: now,
        updated_at: now,
      };
      row[categoryCol] = Math.max(0, scoreDelta);
      row[sourceCol] = Math.max(0, scoreDelta);

      await (supabase.from('member_score_periods') as any).insert(row);
    }
  }
}

// ==================== Event Scoring ====================

export async function scoreEventCompletion(eventId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Fetch event
  const { data: event } = await supabase
    .from('community_events')
    .select('id, status, created_by_member_id, organizer_member_id, event_date, completed_at, title')
    .eq('id', eventId)
    .single();

  if (!event || (event as Record<string, unknown>).status !== 'completed') return;

  const e = event as Record<string, unknown>;
  const memberId = ((e.organizer_member_id as string | null) || e.created_by_member_id) as string;
  if (!memberId) return;

  const effectiveAt = (e.event_date as string) || (e.completed_at as string) || formatDate();

  // Score organizer
  await writeScoreEvent({
    memberId,
    ruleKey: 'event.organizer.completed',
    category: 'participation',
    score: 100,
    sourceType: 'event',
    sourceId: eventId,
    effectiveAt,
    idempotencyKey: `event:${eventId}:member:${memberId}:rule:event.organizer.completed`,
    metadata: { event_title: e.title },
  });

  const { data: verifiedRsvps } = await (supabase.from('community_event_rsvps') as any)
    .select('id')
    .eq('event_id', eventId)
    .eq('actual_attendance', true);

  for (const rsvp of (verifiedRsvps || []) as Array<Record<string, unknown>>) {
    await scoreRsvpAttendance(rsvp.id as string);
  }
}

export async function scoreRsvpAttendance(rsvpId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Fetch RSVP with event data
  const { data: rsvp } = await (supabase.from('community_event_rsvps') as any)
    .select('id, event_id, member_id, actual_attendance, verified_event_role, attendance_mode')
    .eq('id', rsvpId)
    .single();

  if (!rsvp) return;

  const r = rsvp as Record<string, unknown>;
  const eventId = r.event_id as string;
  const memberId = r.member_id as string;

  // Fetch event to check status and mode
  const { data: event } = await supabase
    .from('community_events')
    .select('id, status, created_by_member_id, organizer_member_id, event_mode, event_date, completed_at, title')
    .eq('id', eventId)
    .single();

  if (!event || (event as Record<string, unknown>).status !== 'completed') return;

  const e = event as Record<string, unknown>;
  const effectiveAt = (e.event_date as string) || (e.completed_at as string) || formatDate();

  // If attendance was removed, reverse any existing scores for this member+event
  if (!r.actual_attendance) {
    await reverseRsvpScores(eventId, memberId);
    return;
  }

  const organizerId = ((e.organizer_member_id as string | null) || e.created_by_member_id) as string;

  // If member is the selected organizer, they already get +100; remove attendee/lead scoring.
  if (memberId === organizerId) {
    await reverseRsvpScores(eventId, memberId);
    return;
  }

  // Determine the correct rule key based on role and mode
  let ruleKey: string;
  if (r.verified_event_role === 'lead') {
    ruleKey = 'event.lead.completed';
  } else {
    // Determine attendance mode: use RSVP-level if set, fall back to event-level
    const mode = (r.attendance_mode as string) || (e.event_mode as string) || 'offline';
    ruleKey = mode === 'online' ? 'event.attendee.online.completed' : 'event.attendee.offline.completed';
  }

  const rule = SCORE_RULES[ruleKey];

  // Reverse any existing lower-precedence scores for this member+event
  await reverseRsvpScores(eventId, memberId);

  // Write new score
  await writeScoreEvent({
    memberId,
    ruleKey,
    category: rule.category,
    score: rule.score,
    sourceType: 'event',
    sourceId: eventId,
    effectiveAt,
    idempotencyKey: `event:${eventId}:member:${memberId}:rule:${ruleKey}`,
    metadata: {
      event_title: e.title,
      verified_event_role: r.verified_event_role,
      attendance_mode: r.attendance_mode || e.event_mode,
    },
  });
}

async function reverseRsvpScores(eventId: string, memberId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Find all active (non-reversal) event scores for this member on this event
  const { data: activeScores } = await (supabase.from('score_events') as any)
    .select('id, rule_key')
    .eq('member_id', memberId)
    .eq('source_type', 'event')
    .eq('source_id', eventId)
    .eq('is_reversal', false)
    .in('rule_key', ['event.lead.completed', 'event.attendee.offline.completed', 'event.attendee.online.completed']);

  if (!activeScores) return;

  for (const score of activeScores as Array<Record<string, unknown>>) {
    // Check if not already reversed
    const { data: existingReversal } = await (supabase.from('score_events') as any)
      .select('id')
      .eq('idempotency_key', `reversal:${score.id}`)
      .maybeSingle();

    if (!existingReversal) {
      await writeReversalEvent(score.id as string);
    }
  }
}

export async function reverseEventScores(eventId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Find all active (non-reversal) scores for this event
  const { data: activeScores } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('source_type', 'event')
    .eq('source_id', eventId)
    .eq('is_reversal', false);

  if (!activeScores) return;

  for (const score of activeScores as Array<Record<string, unknown>>) {
    await writeReversalEvent(score.id as string);
  }
}

// ==================== Proposal Scoring ====================

export async function scoreProposalTraction(proposalId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Get proposal creator
  const { data: proposal } = await supabase
    .from('community_proposals')
    .select('id, created_by_member_id, title')
    .eq('id', proposalId)
    .single();

  if (!proposal) return;

  const p = proposal as Record<string, unknown>;
  const creatorId = p.created_by_member_id as string;

  // Check if traction already scored
  const idempotencyKey = `proposal:${proposalId}:rule:proposal.traction.reached`;
  const { data: existing } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) return; // Already scored

  // Count qualifying commitments: will_participate or will_lead, exclude proposal creator
  const { data: commitments } = await supabase
    .from('community_commitments')
    .select('member_id, commitment_level')
    .eq('proposal_id', proposalId)
    .in('commitment_level', ['will_participate', 'will_lead'])
    .neq('member_id', creatorId);

  const uniqueMembers = new Set((commitments || []).map((c: Record<string, unknown>) => c.member_id as string));

  if (uniqueMembers.size < 3) return; // Threshold not met

  // Score traction
  await writeScoreEvent({
    memberId: creatorId,
    ruleKey: 'proposal.traction.reached',
    category: 'participation',
    score: 20,
    sourceType: 'proposal',
    sourceId: proposalId,
    effectiveAt: formatDate(),
    idempotencyKey,
    metadata: { proposal_title: p.title, qualifying_members: uniqueMembers.size },
  });
}

export async function scoreProposalConversion(proposalId: string, eventCreationTimestamp?: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Get proposal creator
  const { data: proposal } = await supabase
    .from('community_proposals')
    .select('id, created_by_member_id, title')
    .eq('id', proposalId)
    .single();

  if (!proposal) return;

  const p = proposal as Record<string, unknown>;
  const creatorId = p.created_by_member_id as string;

  await writeScoreEvent({
    memberId: creatorId,
    ruleKey: 'proposal.converted_to_event',
    category: 'participation',
    score: 30,
    sourceType: 'proposal',
    sourceId: proposalId,
    effectiveAt: eventCreationTimestamp || formatDate(),
    idempotencyKey: `proposal:${proposalId}:rule:proposal.converted_to_event`,
    metadata: { proposal_title: p.title },
  });
}

// ==================== Reference Scoring ====================

export async function scoreReferenceWritten(referenceId: string, writerMemberId: string): Promise<void> {
  await writeScoreEvent({
    memberId: writerMemberId,
    ruleKey: 'reference.written',
    category: 'participation',
    score: 20,
    sourceType: 'member_reference',
    sourceId: referenceId,
    effectiveAt: formatDate(),
    idempotencyKey: `reference:${referenceId}:rule:reference.written`,
  });
}

// ==================== Connection Scoring ====================

export async function scoreConnectionAccepted(contactRequestId: string, targetMemberId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // Get responded_at for effective timestamp
  const { data: request } = await supabase
    .from('contact_requests')
    .select('responded_at')
    .eq('id', contactRequestId)
    .single();

  const effectiveAt = (request as Record<string, unknown>)?.responded_at as string || formatDate();

  await writeScoreEvent({
    memberId: targetMemberId,
    ruleKey: 'connection.accepted',
    category: 'participation',
    score: 10,
    sourceType: 'contact_request',
    sourceId: contactRequestId,
    effectiveAt,
    idempotencyKey: `contact_request:${contactRequestId}:rule:connection.accepted`,
  });
}

// ==================== Comment Scoring ====================

function normalizeCommentBody(body: string): string {
  return body.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function isDuplicateComment(normalizedBody: string, memberId: string, excludeCommentId?: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Check event comments
  let eventQuery = (supabase.from('community_event_comments') as any)
    .select('id, body')
    .eq('member_id', memberId)
    .eq('status', 'visible')
    .gte('created_at', thirtyDaysAgo);

  const { data: eventComments } = await eventQuery;

  for (const c of (eventComments || []) as Array<Record<string, unknown>>) {
    if (excludeCommentId && c.id === excludeCommentId) continue;
    if (normalizeCommentBody(c.body as string) === normalizedBody) return true;
  }

  // Check proposal comments
  let proposalQuery = (supabase.from('community_proposal_comments') as any)
    .select('id, body')
    .eq('member_id', memberId)
    .eq('status', 'visible')
    .gte('created_at', thirtyDaysAgo);

  const { data: proposalComments } = await proposalQuery;

  for (const c of (proposalComments || []) as Array<Record<string, unknown>>) {
    if (excludeCommentId && c.id === excludeCommentId) continue;
    if (normalizeCommentBody(c.body as string) === normalizedBody) return true;
  }

  return false;
}

export async function evaluateCommentScoring(
  commentId: string,
  commentType: 'event' | 'proposal',
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const table = commentType === 'event' ? 'community_event_comments' : 'community_proposal_comments';

  // Fetch the comment
  const { data: comment } = await (supabase.from(table) as any)
    .select('id, member_id, body, status, parent_comment_id, created_at, updated_at')
    .eq('id', commentId)
    .single();

  if (!comment) return;

  const c = comment as Record<string, unknown>;
  const memberId = c.member_id as string;
  const body = c.body as string;
  const status = c.status as string;
  const parentCommentId = c.parent_comment_id as string | null;
  const isReply = !!parentCommentId;

  // Check qualification
  const trimmedBody = body.trim();
  let qualified = true;

  if (status !== 'visible') qualified = false;
  if (trimmedBody.length < 40) qualified = false;

  // Self-reply check
  if (qualified && isReply) {
    const { data: parent } = await (supabase.from(table) as any)
      .select('member_id')
      .eq('id', parentCommentId)
      .single();

    if (parent && (parent as Record<string, unknown>).member_id === memberId) {
      qualified = false; // Self-reply
    }
  }

  // Duplicate check
  if (qualified) {
    const normalized = normalizeCommentBody(body);
    const isDup = await isDuplicateComment(normalized, memberId, commentId);
    if (isDup) qualified = false;
  }

  // Determine rule key
  const ruleKey = isReply ? 'comment.reply.qualified' : 'comment.qualified';
  const idempotencyKey = `comment:${commentId}:rule:${ruleKey}`;

  if (qualified) {
    // Write score for this comment
    const effectiveAt = (c.updated_at as string) || (c.created_at as string) || formatDate();
    await writeScoreEvent({
      memberId,
      ruleKey,
      category: 'engagement',
      score: 5,
      sourceType: commentType === 'event' ? 'event_comment' : 'proposal_comment',
      sourceId: commentId,
      effectiveAt,
      idempotencyKey,
    });

    // If this is a qualified reply by a different member, award reply-received bonus to parent author
    if (isReply && parentCommentId) {
      const { data: parent } = await (supabase.from(table) as any)
        .select('id, member_id')
        .eq('id', parentCommentId)
        .single();

      if (parent) {
        const parentMemberId = (parent as Record<string, unknown>).member_id as string;
        if (parentMemberId !== memberId) {
          // Check if parent comment was itself qualified (has an active score event)
          const { data: parentScore } = await (supabase.from('score_events') as any)
            .select('id')
            .eq('source_id', parentCommentId)
            .eq('is_reversal', false)
            .in('rule_key', ['comment.qualified', 'comment.reply.qualified'])
            .limit(1)
            .maybeSingle();

          if (parentScore) {
            await writeScoreEvent({
              memberId: parentMemberId,
              ruleKey: 'comment.reply.received',
              category: 'engagement',
              score: 5,
              sourceType: commentType === 'event' ? 'event_comment' : 'proposal_comment',
              sourceId: commentId,
              effectiveAt,
              idempotencyKey: `comment:${commentId}:rule:comment.reply.received`,
              metadata: { parent_comment_id: parentCommentId, replier_member_id: memberId },
            });
          }
        }
      }
    }
  } else {
    // Comment is not qualified: reverse any existing scores for this comment
    await reverseCommentScores(commentId, commentType);
  }
}

export async function reverseCommentScores(commentId: string, commentType: 'event' | 'proposal'): Promise<void> {
  const supabase = createServerSupabaseClient();
  const sourceType = commentType === 'event' ? 'event_comment' : 'proposal_comment';

  // Find all active scores for this comment
  const { data: activeScores } = await (supabase.from('score_events') as any)
    .select('id')
    .eq('source_id', commentId)
    .eq('source_type', sourceType)
    .eq('is_reversal', false);

  if (!activeScores) return;

  for (const score of activeScores as Array<Record<string, unknown>>) {
    await writeReversalEvent(score.id as string);
  }
}

// ==================== Aggregate Reconciliation ====================

export async function reconcileAggregates(memberId?: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  // If specific member, only reconcile that member
  const memberFilter = memberId ? { member_id: memberId } : {};

  // Get all score events (or for specific member)
  let query = (supabase.from('score_events') as any).select('*');
  if (memberId) query = query.eq('member_id', memberId);
  const { data: events } = await query;

  if (!events || events.length === 0) return;

  // Delete existing period rows for the member(s) being reconciled
  if (memberId) {
    await (supabase.from('member_score_periods') as any).delete().eq('member_id', memberId);
  } else {
    // Get all unique member IDs
    const memberIds = [...new Set((events as Array<Record<string, unknown>>).map(e => e.member_id as string))];
    for (const mid of memberIds) {
      await (supabase.from('member_score_periods') as any).delete().eq('member_id', mid);
    }
  }

  // Rebuild from all score events
  for (const event of events as Array<Record<string, unknown>>) {
    await upsertPeriodAggregates(
      event.member_id as string,
      event.effective_at as string,
      event.score as number,
      event.category as string,
      event.rule_key as string,
      now,
    );
  }
}

// ==================== Leaderboard Query ====================

export async function getLeaderboardData(options: {
  period: 'month' | 'quarter' | 'year';
  anchor?: string; // YYYY-MM-DD
  limit?: number;
  currentMemberId?: string;
}): Promise<{
  period: {
    type: string;
    label: string;
    start: string;
    end: string;
    timezone: string;
  };
  rankings: Array<{
    rank: number;
    member: {
      id: string;
      name: string;
      avatar_url?: string;
      abg_class?: string;
      public_profile_slug?: string;
    };
    total_score: number;
    participation_score: number;
    engagement_score: number;
    breakdown: {
      events: number;
      proposals: number;
      references: number;
      connections: number;
      comments: number;
    };
    last_scored_at?: string;
  }>;
  current_member: {
    rank: number;
    member: {
      id: string;
      name: string;
      avatar_url?: string;
      abg_class?: string;
      public_profile_slug?: string;
    };
    total_score: number;
    participation_score: number;
    engagement_score: number;
    breakdown: {
      events: number;
      proposals: number;
      references: number;
      connections: number;
      comments: number;
    };
    last_scored_at?: string;
  } | null;
  available_periods: LeaderboardPeriodOption[];
}> {
  const supabase = createServerSupabaseClient();
  const limit = Math.min(options.limit || 50, 100);

  // Compute period start from anchor
  const anchorDate = options.anchor
    ? new Date(options.anchor + 'T00:00:00+07:00')
    : new Date();

  const anchorIso = anchorDate.toISOString();
  const periods = computePeriodBounds(anchorIso);
  const targetPeriod = periods.find(p => p.periodType === options.period)!;

  const periodLabel = getPeriodLabel(options.period, anchorIso);

  // Query rankings: member_score_periods joined with members
  const { data: rows } = await (supabase.from('member_score_periods') as any)
    .select('*, members!member_score_periods_member_id_fkey(id, name, avatar_url, abg_class, public_profile_slug)')
    .eq('period_type', targetPeriod.periodType)
    .eq('period_start', targetPeriod.periodStart)
    .gt('total_score', 0)
    .order('total_score', { ascending: false })
    .order('participation_score', { ascending: false })
    .order('last_scored_at', { ascending: false, nullsFirst: false })
    .order('member_id', { ascending: true });

  const allRankings = (rows || []).map((row: Record<string, unknown>, index: number) => {
    const member = row.members as Record<string, unknown> | null;
    return {
      rank: index + 1,
      member: {
        id: row.member_id as string,
        name: (member?.name as string) || 'Unknown',
        avatar_url: member?.avatar_url as string | undefined,
        abg_class: member?.abg_class as string | undefined,
        public_profile_slug: member?.public_profile_slug as string | undefined,
      },
      total_score: row.total_score as number,
      participation_score: row.participation_score as number,
      engagement_score: row.engagement_score as number,
      breakdown: {
        events: (row.event_score as number) || 0,
        proposals: (row.proposal_score as number) || 0,
        references: (row.reference_score as number) || 0,
        connections: (row.connection_score as number) || 0,
        comments: (row.comment_score as number) || 0,
      },
      last_scored_at: row.last_scored_at as string | undefined,
    };
  });

  const topRankings = allRankings.slice(0, limit);

  // Find current member if not in top rankings
  let currentMember = null;
  if (options.currentMemberId) {
    const inTop = topRankings.find((r: typeof topRankings[0]) => r.member.id === options.currentMemberId);
    if (!inTop) {
      currentMember = allRankings.find((r: typeof allRankings[0]) => r.member.id === options.currentMemberId) || null;
    }
  }

  return {
    period: {
      type: targetPeriod.periodType,
      label: periodLabel,
      start: targetPeriod.periodStart,
      end: targetPeriod.periodEnd,
      timezone: TIMEZONE,
    },
    rankings: topRankings,
    current_member: currentMember,
    available_periods: await getAvailableLeaderboardPeriods(options.period),
  };
}
