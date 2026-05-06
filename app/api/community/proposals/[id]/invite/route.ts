import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';
import { sendDiscussionInvitationEmail } from '@/lib/resend';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';

/* eslint-disable @typescript-eslint/no-explicit-any */

// POST: Send direct email invites for proposals without date poll
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    // Only creator or admin can send invites
    if (proposal.created_by_member_id !== member.id && !member.is_admin) {
      return errorResponse('Only the proposal creator or admin can send invites', 403);
    }

    const body = await request.json();
    const { meeting_date, meeting_link, invited_emails, duration_minutes } = body;

    if (!meeting_date) return errorResponse('Meeting date is required', 400);
    if (!meeting_link) return errorResponse('Meeting link is required', 400);
    if (!meeting_link.startsWith('https://meet.google.com/')) {
      return errorResponse('Please provide a valid Google Meet link', 400);
    }
    if (!invited_emails || !Array.isArray(invited_emails) || invited_emails.length === 0) {
      return errorResponse('At least one email is required', 400);
    }

    const supabase = createServerSupabaseClient();
    const now = formatDate();

    // Create a discussion record to track the invite (direct schedule mode)
    const discussionId = generateId();

    // Check if a discussion already exists
    const { data: existing } = await (supabase.from('proposal_discussions') as any)
      .select('id')
      .eq('proposal_id', id)
      .single();

    if (existing) {
      // Update existing discussion to scheduled
      await (supabase.from('proposal_discussions') as any)
        .update({
          status: 'scheduled',
          meeting_date,
          meeting_link,
          invited_emails,
          updated_at: now,
        })
        .eq('id', existing.id);
    } else {
      // Create new discussion in scheduled state (no date poll needed)
      await (supabase.from('proposal_discussions') as any)
        .insert({
          id: discussionId,
          proposal_id: id,
          status: 'scheduled',
          date_options: [],
          meeting_date,
          meeting_link,
          invited_emails,
          created_at: now,
          updated_at: now,
        });

      // Mark proposal as having discussion
      await (supabase.from('community_proposals') as any)
        .update({ has_discussion: true, updated_at: now })
        .eq('id', id);
    }

    const actualDiscussionId = existing?.id || discussionId;

    // Send email invitations (non-blocking)
    after(async () => {
      const supabaseAfter = createServerSupabaseClient();

      for (const email of invited_emails) {
        // Look up member by email
        const { data: memberRow } = await (supabaseAfter.from('members') as any)
          .select('id, name, email, locale')
          .eq('email', email)
          .single();

        const recipientName = memberRow?.name || email;
        const recipientLocale = (memberRow?.locale as 'vi' | 'en') || 'vi';

        // Send email with .ics calendar invite
        try {
          await sendDiscussionInvitationEmail(
            email,
            recipientName,
            proposal.title,
            meeting_date,
            meeting_link,
            `/proposals/${proposal.slug || proposal.id}`,
            recipientLocale,
            actualDiscussionId,
          );
        } catch (err) {
          console.error(`[email] Direct invite failed for ${email}:`, err);
        }

        // In-app + push notifications for members
        if (memberRow) {
          const memberId = memberRow.id as string;
          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: proposal.title,
              meetingDate: meeting_date,
            }, recipientLocale);

            await createInAppNotifications({
              type: 'discussion_meeting',
              title: message.title,
              body: message.body,
              url: `/proposals/${proposal.slug || proposal.id}`,
              targetMemberId: memberId,
            });
          } catch (err) {
            console.error(`[notif] Direct invite notification failed for ${memberId}:`, err);
          }

          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: proposal.title,
              meetingDate: meeting_date,
            }, recipientLocale);

            await sendPushToMember(memberId, 'discussion_meeting', {
              ...message,
              url: `/proposals/${proposal.slug || proposal.id}`,
            });
          } catch (err) {
            console.error(`[push] Direct invite push failed for ${memberId}:`, err);
          }
        }
      }
    });

    return successResponse({ message: 'Invitations are being sent', discussionId: actualDiscussionId });
  } catch (error) {
    return handleApiError(error);
  }
}
