import { createServerSupabaseClient } from './supabase/server';
import { CommunityProposal, CommunityCommitment, CommunityProposalComment, ProposalCategory, ProposalGenre, ProposalStatus, CommitmentLevel, CommentStatus, ParticipationFormat, COMMITMENT_WEIGHTS } from '@/types';
import { generateId, formatDate, generateSlug } from '@/lib/utils';

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

// ==================== Map Functions ====================

function mapRowToProposal(row: Record<string, unknown>): CommunityProposal {
  return {
    id: row.id as string,
    slug: (row.slug as string) || '',
    created_by_member_id: row.created_by_member_id as string,
    title: row.title as string,
    description: row.description as string,
    category: (row.category as ProposalCategory) || 'other',
    genre: (row.genre as ProposalGenre) || 'other',
    status: (row.status as ProposalStatus) || 'published',
    is_pinned: (row.is_pinned as boolean) || false,
    commitment_score: (row.commitment_score as number) || 0,
    commitment_count: (row.commitment_count as number) || 0,
    comment_count: (row.comment_count as number) || 0,
    target_date: nullToUndefined(row.target_date as string | null),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    published_at: nullToUndefined(row.published_at as string | null),
    selected_at: nullToUndefined(row.selected_at as string | null),
    selected_by_member_id: nullToUndefined(row.selected_by_member_id as string | null),
    completed_at: nullToUndefined(row.completed_at as string | null),
    admin_note: nullToUndefined(row.admin_note as string | null),
    image_url: nullToUndefined((row.image_url as string | null) ?? null),
    tags: (row.tags as string[] | null) || [],
    location: nullToUndefined(row.location as string | null),
    participation_format: (row.participation_format as ParticipationFormat) || undefined,
    has_discussion: (row.has_discussion as boolean) || false,
    has_poll: (row.has_poll as boolean) || false,
    author_name: nullToUndefined(row.author_name as string | null),
    author_avatar_url: nullToUndefined(row.author_avatar_url as string | null),
    author_abg_class: nullToUndefined(row.author_abg_class as string | null),
  };
}

function mapRowToCommitment(row: Record<string, unknown>): CommunityCommitment {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    member_id: row.member_id as string,
    commitment_level: (row.commitment_level as CommitmentLevel) || 'interested',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_name: nullToUndefined(row.member_name as string | null),
    member_avatar_url: nullToUndefined(row.member_avatar_url as string | null),
    member_abg_class: nullToUndefined(row.member_abg_class as string | null),
  };
}

function mapRowToComment(row: Record<string, unknown>): CommunityProposalComment {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
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

// ==================== Proposals ====================

export async function createProposal(data: {
  created_by_member_id: string;
  title: string;
  description: string;
  category: ProposalCategory;
  genre?: string;
  target_date?: string;
  image_url?: string;
  tags?: string[];
  location?: string;
  participation_format?: string;
}): Promise<CommunityProposal> {
  const supabase = createServerSupabaseClient();
  const id = generateId();
  const now = formatDate();

  const slug = generateSlug(data.title);

  const { data: row, error } = await supabase
    .from('community_proposals')
    .insert({
      id,
      slug,
      created_by_member_id: data.created_by_member_id,
      title: data.title,
      description: data.description,
      category: data.category,
      genre: data.genre || 'other',
      target_date: data.target_date || null,
      ...(data.image_url ? { image_url: data.image_url } : {}),
      ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
      ...(data.location ? { location: data.location } : {}),
      ...(data.participation_format ? { participation_format: data.participation_format } : {}),
      status: 'published',
      is_pinned: false,
      commitment_score: 0,
      commitment_count: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      published_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal:', error);
    throw new Error('Không thể tạo đề xuất. Vui lòng thử lại.');
  }

  return mapRowToProposal(row as Record<string, unknown>);
}

export async function getProposals(options: {
  category?: ProposalCategory;
  status?: ProposalStatus;
  page?: number;
  limit?: number;
}): Promise<{ proposals: CommunityProposal[]; total: number }> {
  const supabase = createServerSupabaseClient();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('community_proposals')
    .select('*, members!community_proposals_created_by_member_id_fkey(name, avatar_url, abg_class)', { count: 'exact' });

  if (options.category) {
    query = query.eq('category', options.category);
  }
  if (options.status) {
    query = query.eq('status', options.status);
  } else {
    query = query.neq('status', 'removed');
  }

  // Pinned first, then by commitment_score desc
  query = query
    .order('is_pinned', { ascending: false })
    .order('commitment_score', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: rows, error, count } = await query;

  if (error) {
    console.error('Error fetching proposals:', error);
    throw new Error('Failed to fetch proposals');
  }

  const proposals = (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToProposal({
      ...row,
      author_name: members?.name || null,
      author_avatar_url: members?.avatar_url || null,
      author_abg_class: members?.abg_class || null,
    });
  });

  return { proposals, total: count || 0 };
}

export async function getProposalById(id: string): Promise<CommunityProposal | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_proposals')
    .select('*, members!community_proposals_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching proposal:', error);
    throw new Error('Failed to fetch proposal');
  }

  if (!row) return null;

  const members = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToProposal({
    ...(row as Record<string, unknown>),
    author_name: members?.name || null,
    author_avatar_url: members?.avatar_url || null,
    author_abg_class: members?.abg_class || null,
  });
}

export async function getProposalBySlug(slug: string): Promise<CommunityProposal | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_proposals')
    .select('*, members!community_proposals_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching proposal by slug:', error);
    throw new Error('Failed to fetch proposal');
  }

  if (!row) return null;

  const members = (row as Record<string, unknown>).members as Record<string, unknown> | null;
  return mapRowToProposal({
    ...(row as Record<string, unknown>),
    author_name: members?.name || null,
    author_avatar_url: members?.avatar_url || null,
    author_abg_class: members?.abg_class || null,
  });
}

export async function updateProposal(id: string, data: Partial<{
  title: string;
  description: string;
  category: ProposalCategory;
  genre: string;
  target_date: string | null;
  status: ProposalStatus;
  is_pinned: boolean;
  selected_at: string | null;
  selected_by_member_id: string | null;
  completed_at: string | null;
  admin_note: string | null;
  location: string | null;
  participation_format: string;
  tags: string[];
}>): Promise<CommunityProposal> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_proposals')
    .update({ ...data, updated_at: formatDate() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating proposal:', error);
    throw new Error('Failed to update proposal');
  }

  return mapRowToProposal(row as Record<string, unknown>);
}

// ==================== Commitments ====================

export async function upsertCommitment(data: {
  proposal_id: string;
  member_id: string;
  commitment_level: CommitmentLevel;
}): Promise<CommunityCommitment> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  // Check if commitment already exists
  const { data: existing } = await supabase
    .from('community_commitments')
    .select('id')
    .eq('proposal_id', data.proposal_id)
    .eq('member_id', data.member_id)
    .maybeSingle();

  if (existing) {
    // Update existing commitment
    const { data: row, error } = await supabase
      .from('community_commitments')
      .update({ commitment_level: data.commitment_level, updated_at: now })
      .eq('id', (existing as Record<string, unknown>).id as string)
      .select()
      .single();

    if (error) {
      console.error('Error updating commitment:', error);
      throw new Error('Failed to update commitment');
    }
    return mapRowToCommitment(row as Record<string, unknown>);
  }

  // Create new commitment
  const { data: row, error } = await supabase
    .from('community_commitments')
    .insert({
      id: generateId(),
      proposal_id: data.proposal_id,
      member_id: data.member_id,
      commitment_level: data.commitment_level,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating commitment:', error);
    throw new Error('Failed to create commitment');
  }

  return mapRowToCommitment(row as Record<string, unknown>);
}

export async function removeCommitment(proposalId: string, memberId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_commitments')
    .delete()
    .eq('proposal_id', proposalId)
    .eq('member_id', memberId);

  if (error) {
    console.error('Error removing commitment:', error);
    throw new Error('Failed to remove commitment');
  }
}

export async function getCommitmentsByProposal(proposalId: string): Promise<CommunityCommitment[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('community_commitments')
    .select('*, members!community_commitments_member_id_fkey(name, avatar_url, abg_class)')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching commitments:', error);
    throw new Error('Failed to fetch commitments');
  }

  return (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToCommitment({
      ...row,
      member_name: members?.name || null,
      member_avatar_url: members?.avatar_url || null,
      member_abg_class: members?.abg_class || null,
    });
  });
}

export async function getMemberCommitment(proposalId: string, memberId: string): Promise<CommunityCommitment | null> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_commitments')
    .select()
    .eq('proposal_id', proposalId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching commitment:', error);
    return null;
  }

  if (!row) return null;
  return mapRowToCommitment(row as Record<string, unknown>);
}

// ==================== Comments ====================

export async function createComment(data: {
  proposal_id: string;
  member_id: string;
  body: string;
  parent_comment_id?: string;
  image_url?: string;
}): Promise<CommunityProposalComment> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('community_proposal_comments')
    .insert({
      id: generateId(),
      proposal_id: data.proposal_id,
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
    console.error('Error creating comment:', error);
    throw new Error('Failed to create comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function getCommentsByProposal(proposalId: string, currentMemberId?: string): Promise<CommunityProposalComment[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('community_proposal_comments')
    .select('*, members!community_proposal_comments_member_id_fkey(name, avatar_url)')
    .eq('proposal_id', proposalId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
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

  // Fetch reactions
  const commentIds = allComments.map(c => c.id);
  const { getReactionSummaries } = await import('@/lib/supabase-reactions');
  const reactions = await getReactionSummaries(commentIds, 'proposal', currentMemberId);

  // Build threaded structure
  const topLevel: CommunityProposalComment[] = [];
  const repliesByParent: Record<string, CommunityProposalComment[]> = {};

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

export async function updateComment(commentId: string, body: string): Promise<CommunityProposalComment> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('community_proposal_comments')
    .update({ body, updated_at: formatDate() })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating comment:', error);
    throw new Error('Failed to update comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_proposal_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment');
  }
}

export async function moderateComment(commentId: string, status: CommentStatus): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('community_proposal_comments')
    .update({ status, updated_at: formatDate() })
    .eq('id', commentId);

  if (error) {
    console.error('Error moderating comment:', error);
    throw new Error('Failed to moderate comment');
  }
}

// ==================== Leaderboard ====================

export async function getLeaderboard(options: { monthly?: boolean; limit?: number }): Promise<Array<{
  member_id: string;
  member_name: string;
  member_avatar_url?: string;
  member_abg_class?: string;
  total_score: number;
  commitment_count: number;
  proposals_led: number;
}>> {
  const supabase = createServerSupabaseClient();
  const limit = options.limit || 10;

  // Get all commitments (optionally filtered by month)
  let query = supabase
    .from('community_commitments')
    .select('member_id, commitment_level, proposal_id, members!community_commitments_member_id_fkey(name, avatar_url, abg_class)');

  if (options.monthly) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    query = query.gte('created_at', startOfMonth.toISOString());
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }

  // Aggregate in JS (simpler than complex SQL for small dataset)
  const memberMap = new Map<string, {
    member_id: string;
    member_name: string;
    member_avatar_url?: string;
    member_abg_class?: string;
    total_score: number;
    commitment_count: number;
    proposals_led: number;
  }>();

  for (const row of (rows || [])) {
    const r = row as Record<string, unknown>;
    const memberId = r.member_id as string;
    const level = r.commitment_level as CommitmentLevel;
    const members = r.members as Record<string, unknown> | null;
    const weight = COMMITMENT_WEIGHTS[level] || 1;

    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, {
        member_id: memberId,
        member_name: (members?.name as string) || 'Unknown',
        member_avatar_url: nullToUndefined(members?.avatar_url as string | null),
        member_abg_class: nullToUndefined(members?.abg_class as string | null),
        total_score: 0,
        commitment_count: 0,
        proposals_led: 0,
      });
    }

    const entry = memberMap.get(memberId)!;
    entry.total_score += weight;
    entry.commitment_count += 1;
    if (level === 'will_lead') {
      entry.proposals_led += 1;
    }
  }

  return Array.from(memberMap.values())
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, limit);
}

// ==================== Contribution Profile ====================

export async function getMemberContributions(memberId: string): Promise<{
  proposals_created: number;
  proposals_led: number;
  total_commitments: number;
  total_score: number;
}> {
  const supabase = createServerSupabaseClient();

  // Count proposals created
  const { count: proposalsCreated } = await supabase
    .from('community_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('created_by_member_id', memberId)
    .neq('status', 'removed');

  // Count commitments and score
  const { data: commitments } = await supabase
    .from('community_commitments')
    .select('commitment_level')
    .eq('member_id', memberId);

  let totalScore = 0;
  let proposalsLed = 0;
  for (const c of (commitments || [])) {
    const level = (c as Record<string, unknown>).commitment_level as CommitmentLevel;
    totalScore += COMMITMENT_WEIGHTS[level] || 1;
    if (level === 'will_lead') proposalsLed++;
  }

  return {
    proposals_created: proposalsCreated || 0,
    proposals_led: proposalsLed,
    total_commitments: (commitments || []).length,
    total_score: totalScore,
  };
}

// ==================== Public ====================

export async function getPublicProposals(): Promise<CommunityProposal[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('community_proposals')
    .select('*, members!community_proposals_created_by_member_id_fkey(name, avatar_url, abg_class)')
    .in('status', ['published', 'selected', 'in_progress'])
    .order('is_pinned', { ascending: false })
    .order('commitment_score', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching public proposals:', error);
    return [];
  }

  return (rows || []).map((row: Record<string, unknown>) => {
    const members = row.members as Record<string, unknown> | null;
    return mapRowToProposal({
      ...row,
      author_name: members?.name || null,
      author_avatar_url: members?.avatar_url || null,
      author_abg_class: members?.abg_class || null,
    });
  });
}

// ==================== Admin: Recalculate ====================

export async function recalculateAllProposalScores(): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data: proposals } = await supabase
    .from('community_proposals')
    .select('id');

  if (!proposals) return 0;

  let updated = 0;
  for (const p of proposals) {
    const proposalId = (p as Record<string, unknown>).id as string;

    const { data: commitments } = await supabase
      .from('community_commitments')
      .select('commitment_level')
      .eq('proposal_id', proposalId);

    let score = 0;
    for (const c of (commitments || [])) {
      const level = (c as Record<string, unknown>).commitment_level as CommitmentLevel;
      score += COMMITMENT_WEIGHTS[level] || 1;
    }

    const { count: commentCount } = await supabase
      .from('community_proposal_comments')
      .select('id', { count: 'exact', head: true })
      .eq('proposal_id', proposalId)
      .eq('status', 'visible');

    await supabase
      .from('community_proposals')
      .update({
        commitment_score: score,
        commitment_count: (commitments || []).length,
        comment_count: commentCount || 0,
        updated_at: formatDate(),
      })
      .eq('id', proposalId);

    updated++;
  }

  return updated;
}
