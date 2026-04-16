import { createServerSupabaseClient } from './supabase/server';
import { NewsArticleComment, CommentStatus } from '@/types';
import { generateId, formatDate } from '@/lib/utils';

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

function mapRowToComment(row: Record<string, unknown>): NewsArticleComment {
  return {
    id: row.id as string,
    article_id: row.article_id as string,
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

export async function getNewsArticleIdBySlug(slug: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('news')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function createNewsComment(data: {
  article_id: string;
  member_id: string;
  body: string;
  parent_comment_id?: string;
  image_url?: string;
}): Promise<NewsArticleComment> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const { data: row, error } = await supabase
    .from('news_article_comments')
    .insert({
      id: generateId(),
      article_id: data.article_id,
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
    console.error('Error creating news comment:', error);
    throw new Error('Failed to create news comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function getNewsComments(
  articleId: string,
  currentMemberId?: string
): Promise<NewsArticleComment[]> {
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('news_article_comments')
    .select('*, members!news_article_comments_member_id_fkey(name, avatar_url)')
    .eq('article_id', articleId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching news comments:', error);
    throw new Error('Failed to fetch news comments');
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
  const reactions = await getReactionSummaries(commentIds, 'news', currentMemberId);

  // Build threaded structure
  const topLevel: NewsArticleComment[] = [];
  const repliesByParent: Record<string, NewsArticleComment[]> = {};

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

export async function updateNewsComment(
  commentId: string,
  body: string
): Promise<NewsArticleComment> {
  const supabase = createServerSupabaseClient();

  const { data: row, error } = await supabase
    .from('news_article_comments')
    .update({ body, updated_at: formatDate() } as never)
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating news comment:', error);
    throw new Error('Failed to update news comment');
  }

  return mapRowToComment(row as Record<string, unknown>);
}

export async function deleteNewsComment(commentId: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('news_article_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting news comment:', error);
    throw new Error('Failed to delete news comment');
  }
}
