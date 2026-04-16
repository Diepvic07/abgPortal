/**
 * Backfill script for member scoring system
 * Scans existing activity data and populates score_events + member_score_periods.
 * Safe to rerun — uses idempotency keys to prevent duplicates.
 *
 * Run: npx tsx scripts/backfill-scores.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const TIMEZONE = 'Asia/Ho_Chi_Minh';

// ==================== Period Computation ====================

function toTimezoneDate(isoString: string): Date {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return new Date(parseInt(get('year')), parseInt(get('month')) - 1, parseInt(get('day')),
    parseInt(get('hour')), parseInt(get('minute')), parseInt(get('second')));
}

function formatPeriodDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`;
}

function computePeriodBounds(effectiveAt: string) {
  const local = toTimezoneDate(effectiveAt);
  const year = local.getFullYear();
  const month = local.getMonth() + 1;
  const qStart = Math.floor((month - 1) / 3) * 3 + 1;
  const qEnd = qStart + 3;
  const qEndYear = qEnd > 12 ? year + 1 : year;
  const qEndMonth = qEnd > 12 ? qEnd - 12 : qEnd;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;

  return [
    { periodType: 'month' as const, periodStart: formatPeriodDate(year, month, 1), periodEnd: formatPeriodDate(nextMonthYear, nextMonth, 1) },
    { periodType: 'quarter' as const, periodStart: formatPeriodDate(year, qStart, 1), periodEnd: formatPeriodDate(qEndYear, qEndMonth, 1) },
    { periodType: 'year' as const, periodStart: formatPeriodDate(year, 1, 1), periodEnd: formatPeriodDate(year + 1, 1, 1) },
  ];
}

// ==================== Score Writing ====================

function getSourceColumn(ruleKey: string): string {
  if (ruleKey.startsWith('event.')) return 'event_score';
  if (ruleKey.startsWith('proposal.')) return 'proposal_score';
  if (ruleKey === 'reference.written') return 'reference_score';
  if (ruleKey === 'connection.accepted') return 'connection_score';
  if (ruleKey.startsWith('comment.')) return 'comment_score';
  return 'event_score';
}

let written = 0;
let skipped = 0;

async function writeScore(params: {
  memberId: string;
  ruleKey: string;
  category: 'participation' | 'engagement';
  score: number;
  sourceType: string;
  sourceId: string;
  effectiveAt: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  // Check idempotency
  const { data: existing } = await supabase
    .from('score_events')
    .select('id')
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle();

  if (existing) {
    skipped++;
    return false;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('score_events').insert({
    id: uuidv4(),
    member_id: params.memberId,
    rule_key: params.ruleKey,
    category: params.category,
    score: params.score,
    source_type: params.sourceType,
    source_id: params.sourceId,
    effective_at: params.effectiveAt,
    idempotency_key: params.idempotencyKey,
    is_reversal: false,
    reverses_score_event_id: null,
    metadata: params.metadata || {},
    created_at: now,
  });

  if (error) {
    if (error.code === '23505') { skipped++; return false; }
    console.error(`  Error writing score: ${error.message}`);
    return false;
  }

  written++;
  return true;
}

// ==================== Backfill Functions ====================

async function backfillCompletedEvents() {
  console.log('\n--- Backfilling completed events ---');

  const { data: events } = await supabase
    .from('community_events')
    .select('id, created_by_member_id, completed_at, title, event_mode, status')
    .eq('status', 'completed');

  if (!events || events.length === 0) {
    console.log('  No completed events found');
    return;
  }

  console.log(`  Found ${events.length} completed events`);

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const eventId = e.id as string;
    const creatorId = e.created_by_member_id as string;
    const effectiveAt = (e.completed_at as string) || new Date().toISOString();

    // Score organizer
    await writeScore({
      memberId: creatorId,
      ruleKey: 'event.organizer.completed',
      category: 'participation',
      score: 100,
      sourceType: 'event',
      sourceId: eventId,
      effectiveAt,
      idempotencyKey: `event:${eventId}:member:${creatorId}:rule:event.organizer.completed`,
      metadata: { event_title: e.title },
    });

    // Score verified attendees
    const { data: rsvps } = await supabase
      .from('community_event_rsvps')
      .select('id, member_id, actual_attendance, verified_event_role, attendance_mode')
      .eq('event_id', eventId)
      .eq('actual_attendance', true);

    for (const rsvp of (rsvps || [])) {
      const r = rsvp as Record<string, unknown>;
      const memberId = r.member_id as string;

      // Skip if organizer
      if (memberId === creatorId) continue;

      let ruleKey: string;
      if (r.verified_event_role === 'lead') {
        ruleKey = 'event.lead.completed';
      } else {
        const mode = (r.attendance_mode as string) || (e.event_mode as string) || 'offline';
        ruleKey = mode === 'online' ? 'event.attendee.online.completed' : 'event.attendee.offline.completed';
      }

      const rule = { 'event.lead.completed': 80, 'event.attendee.offline.completed': 30, 'event.attendee.online.completed': 20 } as Record<string, number>;

      await writeScore({
        memberId,
        ruleKey,
        category: 'participation',
        score: rule[ruleKey],
        sourceType: 'event',
        sourceId: eventId,
        effectiveAt,
        idempotencyKey: `event:${eventId}:member:${memberId}:rule:${ruleKey}`,
        metadata: { event_title: e.title, verified_event_role: r.verified_event_role, attendance_mode: r.attendance_mode || e.event_mode },
      });
    }
  }
}

async function backfillProposalTraction() {
  console.log('\n--- Backfilling proposal traction ---');

  const { data: proposals } = await supabase
    .from('community_proposals')
    .select('id, created_by_member_id, title')
    .neq('status', 'removed');

  if (!proposals) return;

  for (const proposal of proposals) {
    const p = proposal as Record<string, unknown>;
    const proposalId = p.id as string;
    const creatorId = p.created_by_member_id as string;

    const { data: commitments } = await supabase
      .from('community_commitments')
      .select('member_id, commitment_level')
      .eq('proposal_id', proposalId)
      .in('commitment_level', ['will_participate', 'will_lead'])
      .neq('member_id', creatorId);

    const uniqueMembers = new Set((commitments || []).map((c: Record<string, unknown>) => c.member_id as string));

    if (uniqueMembers.size >= 3) {
      await writeScore({
        memberId: creatorId,
        ruleKey: 'proposal.traction.reached',
        category: 'participation',
        score: 20,
        sourceType: 'proposal',
        sourceId: proposalId,
        effectiveAt: new Date().toISOString(),
        idempotencyKey: `proposal:${proposalId}:rule:proposal.traction.reached`,
        metadata: { proposal_title: p.title, qualifying_members: uniqueMembers.size },
      });
    }
  }
}

async function backfillProposalConversions() {
  console.log('\n--- Backfilling proposal conversions ---');

  const { data: events } = await supabase
    .from('community_events')
    .select('id, proposal_id, created_at')
    .not('proposal_id', 'is', null);

  if (!events) return;

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const proposalId = e.proposal_id as string;

    const { data: proposal } = await supabase
      .from('community_proposals')
      .select('created_by_member_id, title')
      .eq('id', proposalId)
      .single();

    if (!proposal) continue;

    const p = proposal as Record<string, unknown>;

    await writeScore({
      memberId: p.created_by_member_id as string,
      ruleKey: 'proposal.converted_to_event',
      category: 'participation',
      score: 30,
      sourceType: 'proposal',
      sourceId: proposalId,
      effectiveAt: (e.created_at as string) || new Date().toISOString(),
      idempotencyKey: `proposal:${proposalId}:rule:proposal.converted_to_event`,
      metadata: { proposal_title: p.title },
    });
  }
}

async function backfillReferences() {
  console.log('\n--- Backfilling references ---');

  const { data: refs } = await supabase
    .from('member_references')
    .select('id, writer_member_id, created_at')
    .neq('status', 'removed_by_admin');

  if (!refs) return;

  for (const ref of refs) {
    const r = ref as Record<string, unknown>;
    await writeScore({
      memberId: r.writer_member_id as string,
      ruleKey: 'reference.written',
      category: 'participation',
      score: 20,
      sourceType: 'member_reference',
      sourceId: r.id as string,
      effectiveAt: (r.created_at as string) || new Date().toISOString(),
      idempotencyKey: `reference:${r.id}:rule:reference.written`,
    });
  }
}

async function backfillConnections() {
  console.log('\n--- Backfilling accepted connections ---');

  const { data: requests } = await supabase
    .from('contact_requests')
    .select('id, target_id, responded_at')
    .eq('status', 'accepted');

  if (!requests) return;

  for (const req of requests) {
    const r = req as Record<string, unknown>;
    await writeScore({
      memberId: r.target_id as string,
      ruleKey: 'connection.accepted',
      category: 'participation',
      score: 10,
      sourceType: 'contact_request',
      sourceId: r.id as string,
      effectiveAt: (r.responded_at as string) || new Date().toISOString(),
      idempotencyKey: `contact_request:${r.id}:rule:connection.accepted`,
    });
  }
}

async function backfillComments() {
  console.log('\n--- Backfilling qualified comments ---');

  // Helper to normalize body
  const normalize = (body: string) => body.trim().toLowerCase().replace(/\s+/g, ' ');

  // Collect all visible comments from both tables for duplicate detection
  const memberBodies = new Map<string, Set<string>>();

  async function processCommentTable(table: string, commentType: 'event' | 'proposal') {
    const { data: comments } = await supabase
      .from(table)
      .select('id, member_id, body, status, parent_comment_id, created_at')
      .eq('status', 'visible')
      .order('created_at', { ascending: true });

    if (!comments) return;

    for (const comment of comments) {
      const c = comment as Record<string, unknown>;
      const body = c.body as string;
      const memberId = c.member_id as string;
      const trimmed = body.trim();
      const parentCommentId = c.parent_comment_id as string | null;
      const isReply = !!parentCommentId;

      // Check qualification
      if (trimmed.length < 40) continue;

      // Self-reply check
      if (isReply) {
        const { data: parent } = await supabase
          .from(table)
          .select('member_id')
          .eq('id', parentCommentId!)
          .single();

        if (parent && (parent as Record<string, unknown>).member_id === memberId) continue;
      }

      // Duplicate check
      const normalized = normalize(body);
      if (!memberBodies.has(memberId)) memberBodies.set(memberId, new Set());
      const bodies = memberBodies.get(memberId)!;

      if (bodies.has(normalized)) continue; // Duplicate
      bodies.add(normalized);

      const ruleKey = isReply ? 'comment.reply.qualified' : 'comment.qualified';
      const sourceType = commentType === 'event' ? 'event_comment' : 'proposal_comment';

      await writeScore({
        memberId,
        ruleKey,
        category: 'engagement',
        score: 5,
        sourceType,
        sourceId: c.id as string,
        effectiveAt: (c.created_at as string) || new Date().toISOString(),
        idempotencyKey: `comment:${c.id}:rule:${ruleKey}`,
      });

      // Reply-received bonus
      if (isReply && parentCommentId) {
        const { data: parent } = await supabase
          .from(table)
          .select('id, member_id')
          .eq('id', parentCommentId)
          .single();

        if (parent) {
          const parentMemberId = (parent as Record<string, unknown>).member_id as string;
          if (parentMemberId !== memberId) {
            await writeScore({
              memberId: parentMemberId,
              ruleKey: 'comment.reply.received',
              category: 'engagement',
              score: 5,
              sourceType,
              sourceId: c.id as string,
              effectiveAt: (c.created_at as string) || new Date().toISOString(),
              idempotencyKey: `comment:${c.id}:rule:comment.reply.received`,
              metadata: { parent_comment_id: parentCommentId, replier_member_id: memberId },
            });
          }
        }
      }
    }
  }

  await processCommentTable('community_event_comments', 'event');
  await processCommentTable('community_proposal_comments', 'proposal');
}

async function rebuildAggregates() {
  console.log('\n--- Rebuilding aggregates ---');

  // Clear existing aggregates
  await supabase.from('member_score_periods').delete().neq('member_id', '');

  // Fetch all score events
  const { data: events } = await supabase
    .from('score_events')
    .select('member_id, effective_at, score, category, rule_key')
    .order('effective_at', { ascending: true });

  if (!events) return;

  const now = new Date().toISOString();

  // Aggregate in memory
  type PeriodKey = string; // "memberId|periodType|periodStart"
  const aggregates = new Map<PeriodKey, {
    member_id: string;
    period_type: string;
    period_start: string;
    period_end: string;
    total_score: number;
    participation_score: number;
    engagement_score: number;
    event_score: number;
    proposal_score: number;
    reference_score: number;
    connection_score: number;
    comment_score: number;
    last_scored_at: string;
  }>();

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const periods = computePeriodBounds(e.effective_at as string);
    const sourceCol = getSourceColumn(e.rule_key as string);
    const categoryCol = (e.category as string) === 'participation' ? 'participation_score' : 'engagement_score';

    for (const period of periods) {
      const key = `${e.member_id}|${period.periodType}|${period.periodStart}`;

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          member_id: e.member_id as string,
          period_type: period.periodType,
          period_start: period.periodStart,
          period_end: period.periodEnd,
          total_score: 0,
          participation_score: 0,
          engagement_score: 0,
          event_score: 0,
          proposal_score: 0,
          reference_score: 0,
          connection_score: 0,
          comment_score: 0,
          last_scored_at: now,
        });
      }

      const agg = aggregates.get(key)!;
      const score = e.score as number;
      agg.total_score += score;
      (agg as Record<string, unknown>)[categoryCol] = ((agg as Record<string, unknown>)[categoryCol] as number) + score;
      (agg as Record<string, unknown>)[sourceCol] = ((agg as Record<string, unknown>)[sourceCol] as number) + score;
    }
  }

  // Batch insert aggregates
  const rows = Array.from(aggregates.values())
    .filter(a => a.total_score > 0)
    .map(a => ({
      ...a,
      timezone: TIMEZONE,
      updated_at: now,
    }));

  if (rows.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase.from('member_score_periods').insert(batch);
      if (error) {
        console.error(`  Error inserting aggregates batch: ${error.message}`);
      }
    }
  }

  console.log(`  Created ${rows.length} period aggregate rows`);
}

// ==================== Main ====================

async function main() {
  console.log('=== Member Score Backfill ===');
  console.log(`Supabase URL: ${supabaseUrl}`);

  await backfillCompletedEvents();
  await backfillProposalTraction();
  await backfillProposalConversions();
  await backfillReferences();
  await backfillConnections();
  await backfillComments();

  console.log(`\nScore events: ${written} written, ${skipped} skipped (already exist)`);

  await rebuildAggregates();

  console.log('\n=== Backfill complete ===');
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
