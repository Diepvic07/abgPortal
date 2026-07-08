import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getEventById } from '@/lib/supabase-events';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendDiscussionInvitationEmail } from '@/lib/resend';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import { normalizeMeetingLink, normalizeMeetingPlatform, getMeetingPlatformEmailLabels } from '@/lib/meeting-link';

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

    const participants: { name: string; email: string; is_guest?: boolean }[] = [];
    const seenEmails = new Set<string>();
    for (const row of rsvpRows || []) {
      const m = row.members as Record<string, unknown> | null;
      if (m?.email) {
        const email = m.email as string;
        seenEmails.add(email.toLowerCase());
        participants.push({ name: (m.name as string) || '', email });
      }
    }

    // Also include registered guests (event_guest_rsvps is a separate table)
    const { data: guestRows } = await (supabase.from('event_guest_rsvps') as any)
      .select('guest_name, guest_email')
      .eq('event_id', id)
      .eq('status', 'registered');

    for (const row of guestRows || []) {
      const email = row.guest_email as string | null;
      if (!email) continue;
      if (seenEmails.has(email.toLowerCase())) continue;
      seenEmails.add(email.toLowerCase());
      participants.push({
        name: (row.guest_name as string) || '',
        email,
        is_guest: true,
      });
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
    const event_mode: 'online' | 'offline' = body.event_mode === 'offline' ? 'offline' : 'online';
    const normalizedMeetingLink = (event_mode === 'online' ? normalizeMeetingLink(meeting_link) : '') || '';
    const meeting_platform = normalizeMeetingPlatform(body.meeting_platform);
    const meeting_id = typeof body.meeting_id === 'string' ? body.meeting_id.trim().slice(0, 100) : '';
    const meeting_passcode = typeof body.meeting_passcode === 'string' ? body.meeting_passcode.trim().slice(0, 100) : '';
    const email_subject = typeof body.email_subject === 'string' ? body.email_subject.trim().slice(0, 200) : '';
    const email_intro = typeof body.email_intro === 'string' ? body.email_intro.trim().slice(0, 2000) : '';
    const meeting_end_date = typeof body.meeting_end_date === 'string' ? body.meeting_end_date.trim() : '';
    const rawLocation = typeof body.location === 'string' ? body.location.trim().slice(0, 500) : '';
    const rawLocationUrl = typeof body.location_url === 'string' ? body.location_url.trim() : '';
    const normalizedLocationUrl = (rawLocationUrl ? normalizeMeetingLink(rawLocationUrl) : '') || '';

    if (!meeting_date) return errorResponse('Meeting date is required', 400);
    if (event_mode === 'online') {
      if (!meeting_link) return errorResponse('Meeting link is required', 400);
      if (!normalizedMeetingLink) return errorResponse('Please provide a valid HTTPS meeting link', 400);
    } else {
      if (!rawLocation) return errorResponse('Location is required for offline events', 400);
      if (rawLocationUrl && !normalizedLocationUrl) {
        return errorResponse('Please provide a valid HTTPS location URL', 400);
      }
    }
    if (meeting_end_date) {
      const start = new Date(meeting_date).getTime();
      const end = new Date(meeting_end_date).getTime();
      if (!Number.isFinite(end) || end <= start) {
        return errorResponse('End date must be after start date', 400);
      }
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
          const platformLabels = getMeetingPlatformEmailLabels(meeting_platform, recipientLocale);
          await sendDiscussionInvitationEmail(
            email,
            recipientName,
            event.title,
            meeting_date,
            normalizedMeetingLink,
            `/events/${event.slug || event.id}`,
            recipientLocale,
            `event-${id}`,
            {
              ...platformLabels,
              calendarDetailsLabel: recipientLocale === 'vi' ? 'Chi tiết sự kiện' : 'View event',
              meetingId: meeting_id || undefined,
              meetingPasscode: meeting_passcode || undefined,
              customSubject: email_subject || undefined,
              customIntro: email_intro || undefined,
              isOffline: event_mode === 'offline',
              locationText: rawLocation || undefined,
              locationUrl: normalizedLocationUrl || undefined,
              meetingEndDate: meeting_end_date || undefined,
            },
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
