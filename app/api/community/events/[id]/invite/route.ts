import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById } from '@/lib/supabase-events';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendDiscussionInvitationEmail } from '@/lib/resend';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET: Fetch RSVP member emails for invite panel
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) return errorResponse('Event not found', 404);

    // Only creator or admin can view invite list
    if (event.created_by_member_id !== member.id && !member.is_admin) {
      return errorResponse('Only the event creator or admin can send invites', 403);
    }

    const supabase = createServerSupabaseClient();

    // Get all RSVP members with emails
    const { data: rsvpRows } = await (supabase.from('community_event_rsvps') as any)
      .select('member_id, commitment_level, members:member_id(name, email)')
      .eq('event_id', id)
      .in('commitment_level', ['will_participate', 'will_lead']);

    const participants: { name: string; email: string }[] = [];
    for (const row of rsvpRows || []) {
      const m = row.members as Record<string, unknown> | null;
      if (m?.email) {
        participants.push({ name: (m.name as string) || '', email: m.email as string });
      }
    }

    return successResponse({ participants });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Send direct email invites for events
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const event = await getEventById(id);
    if (!event) return errorResponse('Event not found', 404);

    // Only creator or admin can send invites
    if (event.created_by_member_id !== member.id && !member.is_admin) {
      return errorResponse('Only the event creator or admin can send invites', 403);
    }

    const body = await request.json();
    const { meeting_date, meeting_link, invited_emails } = body;

    if (!meeting_date) return errorResponse('Meeting date is required', 400);
    if (!meeting_link) return errorResponse('Meeting link is required', 400);
    if (!meeting_link.startsWith('https://meet.google.com/')) {
      return errorResponse('Please provide a valid Google Meet link', 400);
    }
    if (!invited_emails || !Array.isArray(invited_emails) || invited_emails.length === 0) {
      return errorResponse('At least one email is required', 400);
    }

    // Send email invitations (non-blocking)
    after(async () => {
      const supabaseAfter = createServerSupabaseClient();

      for (const email of invited_emails) {
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
            event.title,
            meeting_date,
            meeting_link,
            `/events/${event.slug || event.id}`,
            recipientLocale,
            `event-${id}`,
          );
        } catch (err) {
          console.error(`[email] Event invite failed for ${email}:`, err);
        }

        // In-app + push notifications for members
        if (memberRow) {
          const memberId = memberRow.id as string;
          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: event.title,
              meetingDate: meeting_date,
            }, recipientLocale);

            await createInAppNotifications({
              type: 'discussion_meeting',
              title: message.title,
              body: message.body,
              url: `/events/${event.slug || event.id}`,
              targetMemberId: memberId,
            });
          } catch (err) {
            console.error(`[notif] Event invite notification failed for ${memberId}:`, err);
          }

          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: event.title,
              meetingDate: meeting_date,
            }, recipientLocale);

            await sendPushToMember(memberId, 'discussion_meeting', {
              ...message,
              url: `/events/${event.slug || event.id}`,
            });
          } catch (err) {
            console.error(`[push] Event invite push failed for ${memberId}:`, err);
          }
        }
      }
    });

    return successResponse({ message: 'Invitations are being sent' });
  } catch (error) {
    return handleApiError(error);
  }
}
