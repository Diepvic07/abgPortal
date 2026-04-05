import { createServerSupabaseClient } from './supabase/server';
import { ReactionType, CommentType, ReactionSummary } from '@/types';
import { generateId } from '@/lib/utils';

export async function upsertReaction(
  commentId: string,
  commentType: CommentType,
  memberId: string,
  reactionType: ReactionType
): Promise<void> {
  const supabase = createServerSupabaseClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: existing } = await client
    .from('comment_reactions')
    .select('id')
    .eq('comment_id', commentId)
    .eq('comment_type', commentType)
    .eq('member_id', memberId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from('comment_reactions')
      .update({ reaction_type: reactionType })
      .eq('id', existing.id);

    if (error) {
      console.error('Error updating reaction:', error);
      throw new Error('Failed to update reaction');
    }
  } else {
    const { error } = await client
      .from('comment_reactions')
      .insert({
        id: generateId(),
        comment_id: commentId,
        comment_type: commentType,
        member_id: memberId,
        reaction_type: reactionType,
      });

    if (error) {
      console.error('Error creating reaction:', error);
      throw new Error('Failed to create reaction');
    }
  }
}

export async function removeReaction(
  commentId: string,
  commentType: CommentType,
  memberId: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { error } = await client
    .from('comment_reactions')
    .delete()
    .eq('comment_id', commentId)
    .eq('comment_type', commentType)
    .eq('member_id', memberId);

  if (error) {
    console.error('Error removing reaction:', error);
    throw new Error('Failed to remove reaction');
  }
}

export async function getReactionSummaries(
  commentIds: string[],
  commentType: CommentType,
  currentMemberId?: string
): Promise<Record<string, ReactionSummary>> {
  if (commentIds.length === 0) return {};

  const supabase = createServerSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const { data: rows, error } = await client
    .from('comment_reactions')
    .select('comment_id, member_id, reaction_type')
    .eq('comment_type', commentType)
    .in('comment_id', commentIds);

  if (error) {
    console.error('Error fetching reactions:', error);
    return {};
  }

  const summaries: Record<string, ReactionSummary> = {};

  for (const id of commentIds) {
    summaries[id] = { like: 0, heart: 0, haha: 0, wow: 0, sad: 0, cold: 0, fire: 0, hug: 0, highfive: 0 };
  }

  for (const row of (rows || []) as Array<Record<string, unknown>>) {
    const cid = row.comment_id as string;
    const rtype = row.reaction_type as ReactionType;
    const mid = row.member_id as string;

    if (summaries[cid]) {
      summaries[cid][rtype]++;
      if (currentMemberId && mid === currentMemberId) {
        summaries[cid].my_reaction = rtype;
      }
    }
  }

  return summaries;
}
