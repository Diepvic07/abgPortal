import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById, getCommentsByProposal, createComment } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import type { Locale } from '@/lib/i18n/utils';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const comments = await getCommentsByProposal(id, member.id);
    return successResponse({ comments, currentMemberId: member.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const body = await request.json();
    const { body: commentBody, parent_comment_id, image_url } = body;

    const text = commentBody || '';
    if (!text && !image_url) {
      return errorResponse('Comment must have text or an image', 400);
    }
    if (text.length > 2000) {
      return errorResponse('Comment must be at most 2000 characters', 400);
    }

    const comment = await createComment({
      proposal_id: id,
      member_id: member.id,
      body: text,
      parent_comment_id: parent_comment_id || undefined,
      image_url: image_url || undefined,
    });

    // Send notifications after response
    after(async () => {
      const commentPreview = text
        ? text.length > 80 ? text.slice(0, 80) + '...' : text
        : '(image)';
      const url = `/proposals/${id}`;
      const notifiedMemberIds = new Set<string>();

      const supabase = createServerSupabaseClient();

      // 1. Notify proposal creator (if commenter is not the creator)
      if (proposal.created_by_member_id && proposal.created_by_member_id !== member.id) {
        notifiedMemberIds.add(proposal.created_by_member_id);

        // Fetch creator locale
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: creator } = await (supabase.from('members') as any)
          .select('locale')
          .eq('id', proposal.created_by_member_id)
          .single();
        const locale = (creator?.locale || 'vi') as Locale;
        const message = getPushMessage('proposal_comment', { commenterName: member.name, commentPreview }, locale);

        try {
          await createInAppNotifications({
            type: 'proposal_comment',
            title: message.title,
            body: message.body,
            url,
            targetMemberId: proposal.created_by_member_id,
          });
        } catch (err) {
          console.error('[in-app-notif] Comment notification to creator failed:', err);
        }

        try {
          await sendPushToMember(proposal.created_by_member_id, 'proposal_comment', { ...message, url });
        } catch (err) {
          console.error('[push] Comment notification to creator failed:', err);
        }
      }

      // 2. If this is a reply, notify the parent comment author
      if (parent_comment_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: parentComment } = await (supabase.from('community_proposal_comments') as any)
          .select('member_id')
          .eq('id', parent_comment_id)
          .single();

        if (parentComment && parentComment.member_id !== member.id && !notifiedMemberIds.has(parentComment.member_id)) {
          // Fetch parent author locale
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: parentAuthor } = await (supabase.from('members') as any)
            .select('locale')
            .eq('id', parentComment.member_id)
            .single();
          const locale = (parentAuthor?.locale || 'vi') as Locale;
          const message = getPushMessage('proposal_comment', { commenterName: member.name, commentPreview }, locale);

          try {
            await createInAppNotifications({
              type: 'proposal_comment',
              title: message.title,
              body: message.body,
              url,
              targetMemberId: parentComment.member_id,
            });
          } catch (err) {
            console.error('[in-app-notif] Reply notification failed:', err);
          }

          try {
            await sendPushToMember(parentComment.member_id, 'proposal_comment', { ...message, url });
          } catch (err) {
            console.error('[push] Reply notification failed:', err);
          }
        }
      }

      // 3. Notify @mentioned members (skip those already notified)
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentionedIds: string[] = [];
      let mentionMatch;
      while ((mentionMatch = mentionRegex.exec(text)) !== null) {
        const mentionedId = mentionMatch[2];
        if (mentionedId !== member.id && !notifiedMemberIds.has(mentionedId)) {
          mentionedIds.push(mentionedId);
          notifiedMemberIds.add(mentionedId);
        }
      }

      if (mentionedIds.length > 0) {
        // Fetch locales for mentioned members
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: mentionedMembers } = await (supabase.from('members') as any)
          .select('id, locale')
          .in('id', mentionedIds);

        const localeMap = new Map((mentionedMembers || []).map((m: { id: string; locale: string | null }) => [m.id, m.locale]));

        for (const mentionedId of mentionedIds) {
          const locale = ((localeMap.get(mentionedId)) || 'vi') as Locale;
          const message = getPushMessage('proposal_comment', { commenterName: member.name, commentPreview }, locale);

          try {
            await createInAppNotifications({
              type: 'proposal_comment',
              title: message.title,
              body: message.body,
              url,
              targetMemberId: mentionedId,
            });
          } catch (err) {
            console.error('[in-app-notif] Mention notification failed:', err);
          }

          try {
            await sendPushToMember(mentionedId, 'proposal_comment', { ...message, url });
          } catch (err) {
            console.error('[push] Mention notification failed:', err);
          }
        }
      }
    });

    return successResponse({ comment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
