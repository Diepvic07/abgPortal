import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import {
  getNewsArticleIdBySlug,
  getNewsComments,
  createNewsComment,
} from '@/lib/supabase-news-comments';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import { getAdminMemberIds } from '@/lib/supabase-db';
import type { Locale } from '@/lib/i18n/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const member = await requireAuth(request);
    const { slug } = await params;

    const articleId = await getNewsArticleIdBySlug(slug);
    if (!articleId) return errorResponse('Article not found', 404);

    const comments = await getNewsComments(articleId, member.id);
    return successResponse({ comments, currentMemberId: member.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const member = await requireAuth(request);
    const { slug } = await params;

    const supabase = createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: article } = await (supabase.from('news') as any)
      .select('id, title, title_vi, tagged_member_ids')
      .eq('slug', slug)
      .maybeSingle();
    if (!article) return errorResponse('Article not found', 404);

    const articleRow = article as {
      id: string;
      title: string;
      title_vi: string | null;
      tagged_member_ids: string[] | null;
    };
    const articleId = articleRow.id;

    const body = await request.json();
    const { body: commentBody, parent_comment_id, image_url } = body;

    const text = commentBody || '';
    if (!text && !image_url) {
      return errorResponse('Comment must have text or an image', 400);
    }
    if (text.length > 2000) {
      return errorResponse('Comment must be at most 2000 characters', 400);
    }

    const comment = await createNewsComment({
      article_id: articleId,
      member_id: member.id,
      body: text,
      parent_comment_id: parent_comment_id || undefined,
      image_url: image_url || undefined,
    });

    // Send notifications after response
    after(async () => {
      const cleanText = text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
      const commentPreview = cleanText
        ? cleanText.length > 80 ? cleanText.slice(0, 80) + '...' : cleanText
        : '(image)';
      const url = `/news/${slug}`;
      const notifiedMemberIds = new Set<string>([member.id]);

      // Collect subscriber IDs: all admins + tagged members (excluding commenter)
      const subscriberIds = new Set<string>();
      try {
        const adminIds = await getAdminMemberIds();
        for (const id of adminIds) subscriberIds.add(id);
      } catch (err) {
        console.error('[news-comment] Failed to fetch admin IDs:', err);
      }
      for (const id of articleRow.tagged_member_ids || []) subscriberIds.add(id);
      subscriberIds.delete(member.id);

      if (subscriberIds.size > 0) {
        const ids = [...subscriberIds];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subMembers } = await (supabase.from('members') as any)
          .select('id, locale')
          .in('id', ids);
        const localeMap = new Map(
          (subMembers || []).map((m: { id: string; locale: string | null }) => [m.id, m.locale])
        );

        for (const targetId of ids) {
          if (notifiedMemberIds.has(targetId)) continue;
          notifiedMemberIds.add(targetId);

          const locale = ((localeMap.get(targetId)) || 'vi') as Locale;
          const articleTitle = (locale === 'vi' && articleRow.title_vi) || articleRow.title;
          const message = getPushMessage(
            'news_comment',
            { commenterName: member.name, commentPreview, articleTitle },
            locale
          );

          try {
            await createInAppNotifications({
              type: 'news_comment',
              title: message.title,
              body: message.body,
              url,
              targetMemberId: targetId,
            });
          } catch (err) {
            console.error('[in-app-notif] News subscriber notification failed:', err);
          }

          try {
            await sendPushToMember(targetId, 'news_comment', { ...message, url });
          } catch (err) {
            console.error('[push] News subscriber notification failed:', err);
          }
        }
      }

      // 1. If reply, notify parent comment author
      if (parent_comment_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: parentComment } = await (supabase.from('news_article_comments') as any)
          .select('member_id')
          .eq('id', parent_comment_id)
          .single();

        if (parentComment && !notifiedMemberIds.has(parentComment.member_id)) {
          notifiedMemberIds.add(parentComment.member_id);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: parentAuthor } = await (supabase.from('members') as any)
            .select('locale')
            .eq('id', parentComment.member_id)
            .single();
          const locale = (parentAuthor?.locale || 'vi') as Locale;
          const articleTitle = (locale === 'vi' && articleRow.title_vi) || articleRow.title;
          const message = getPushMessage(
            'news_comment',
            { commenterName: member.name, commentPreview, articleTitle },
            locale
          );

          try {
            await createInAppNotifications({
              type: 'news_comment',
              title: message.title,
              body: message.body,
              url,
              targetMemberId: parentComment.member_id,
            });
          } catch (err) {
            console.error('[in-app-notif] News reply notification failed:', err);
          }

          try {
            await sendPushToMember(parentComment.member_id, 'news_comment', { ...message, url });
          } catch (err) {
            console.error('[push] News reply notification failed:', err);
          }
        }
      }

      // 2. Notify @mentioned members
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionedIds: string[] = [];
      let mentionMatch;
      while ((mentionMatch = mentionRegex.exec(text)) !== null) {
        const mentionedId = mentionMatch[2];
        if (!notifiedMemberIds.has(mentionedId)) {
          mentionedIds.push(mentionedId);
          notifiedMemberIds.add(mentionedId);
        }
      }

      if (mentionedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: mentionedMembers } = await (supabase.from('members') as any)
          .select('id, locale')
          .in('id', mentionedIds);

        const localeMap = new Map(
          (mentionedMembers || []).map((m: { id: string; locale: string | null }) => [m.id, m.locale])
        );

        for (const mentionedId of mentionedIds) {
          const locale = ((localeMap.get(mentionedId)) || 'vi') as Locale;
          const articleTitle = (locale === 'vi' && articleRow.title_vi) || articleRow.title;
          const message = getPushMessage(
            'news_comment',
            { commenterName: member.name, commentPreview, articleTitle },
            locale
          );

          try {
            await createInAppNotifications({
              type: 'news_comment',
              title: message.title,
              body: message.body,
              url,
              targetMemberId: mentionedId,
            });
          } catch (err) {
            console.error('[in-app-notif] News mention notification failed:', err);
          }

          try {
            await sendPushToMember(mentionedId, 'news_comment', { ...message, url });
          } catch (err) {
            console.error('[push] News mention notification failed:', err);
          }
        }
      }
    });

    return successResponse({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
