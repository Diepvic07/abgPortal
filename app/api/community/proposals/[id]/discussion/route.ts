import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';
import { ProposalDiscussion, DiscussionResponse } from '@/types';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import { sendDiscussionInvitationEmail, sendDiscussionDateChangeEmail, sendDiscussionReminderEmail, sendDiscussionCancellationEmail, sendDiscussionUpdateEmail } from '@/lib/resend';
import { normalizeMeetingLink, normalizeMeetingPlatform, getMeetingPlatformEmailLabels, MeetingPlatform } from '@/lib/meeting-link';

function mapRowToDiscussion(row: Record<string, unknown>): ProposalDiscussion {
  return {
    id: row.id as string,
    proposal_id: row.proposal_id as string,
    title: (row.title as string) || undefined,
    description: (row.description as string) || undefined,
    status: row.status as ProposalDiscussion['status'],
    date_options: (row.date_options as string[]) || [],
    meeting_date: (row.meeting_date as string) || undefined,
    meeting_link: (row.meeting_link as string) || undefined,
    meeting_platform: (row.meeting_platform as MeetingPlatform) || undefined,
    invited_emails: (row.invited_emails as string[]) || [],
    reminder_sent: (row.reminder_sent as boolean) || false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapRowToResponse(row: Record<string, unknown>): DiscussionResponse {
  return {
    id: row.id as string,
    discussion_id: row.discussion_id as string,
    member_id: row.member_id as string,
    available_dates: (row.available_dates as string[]) || [],
    question: (row.question as string) || undefined,
    rsvp_status: (row.rsvp_status as DiscussionResponse['rsvp_status']) || 'pending',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_name: (row.member_name as string) || undefined,
    member_email: (row.member_email as string) || undefined,
    member_avatar_url: (row.member_avatar_url as string) || undefined,
    member_public_profile_slug: (row.member_public_profile_slug as string) || undefined,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// GET: Fetch discussion + responses for a proposal
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: discussion } = await (supabase.from('proposal_discussions') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!discussion) {
      return successResponse({ discussion: null, responses: [] });
    }

    // Backfill creator's auto-vote if missing (for discussions created before this feature)
    if (discussion.status === 'open') {
      const { data: proposal } = await (supabase.from('community_proposals') as any)
        .select('created_by_member_id')
        .eq('id', id)
        .single();

      if (proposal) {
        const creatorId = proposal.created_by_member_id as string;
        const allDates = (discussion.date_options as string[]) || [];
        const { data: creatorResp } = await (supabase.from('proposal_discussion_responses') as any)
          .select('id, available_dates')
          .eq('discussion_id', discussion.id)
          .eq('member_id', creatorId)
          .single();

        const now = formatDate();
        if (!creatorResp) {
          // No response at all — create one with all options
          await (supabase.from('proposal_discussion_responses') as any)
            .insert({
              id: generateId(),
              discussion_id: discussion.id,
              member_id: creatorId,
              available_dates: allDates,
              created_at: now,
              updated_at: now,
            });
        } else {
          // Response exists — ensure all date options are included
          const existing = (creatorResp.available_dates as string[]) || [];
          const missingDates = allDates.filter((d: string) => !existing.includes(d));
          if (missingDates.length > 0) {
            await (supabase.from('proposal_discussion_responses') as any)
              .update({
                available_dates: allDates,
                updated_at: now,
              })
              .eq('id', creatorResp.id);
          }
        }
      }
    }

    const { data: responseRows } = await (supabase.from('proposal_discussion_responses') as any)
      .select('*, members:member_id(name, email, avatar_url, public_profile_slug)')
      .eq('discussion_id', discussion.id)
      .order('created_at', { ascending: true });

    const responses: DiscussionResponse[] = (responseRows || []).map((r: Record<string, unknown>) => {
      const member = r.members as Record<string, unknown> | null;
      return mapRowToResponse({
        ...r,
        member_name: member?.name,
        member_email: member?.email,
        member_avatar_url: member?.avatar_url,
        member_public_profile_slug: member?.public_profile_slug,
      });
    });

    return successResponse({
      discussion: mapRowToDiscussion(discussion as Record<string, unknown>),
      responses,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Create a discussion (proposal creator only)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);
    if (proposal.created_by_member_id !== member.id) return errorResponse('Only the proposal creator can create a discussion', 403);

    const supabase = createServerSupabaseClient();

    // Check if discussion already exists
    const { data: existing } = await (supabase.from('proposal_discussions') as any)
      .select('id')
      .eq('proposal_id', id)
      .single();

    if (existing) return errorResponse('Discussion already exists for this proposal', 400);

    const body = await request.json();
    const { date_options } = body;

    if (!Array.isArray(date_options) || date_options.length < 2 || date_options.length > 10) {
      return errorResponse('Please provide 2-10 date options', 400);
    }

    const now = formatDate();
    const discussionId = generateId();

    const { data: row, error } = await (supabase.from('proposal_discussions') as any)
      .insert({
        id: discussionId,
        proposal_id: id,
        status: 'open',
        date_options,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw new Error('Failed to create discussion');

    // Auto-create creator's vote for all date options
    await (supabase.from('proposal_discussion_responses') as any)
      .insert({
        id: generateId(),
        discussion_id: discussionId,
        member_id: member.id,
        available_dates: date_options,
        created_at: now,
        updated_at: now,
      });

    // Mark proposal as having discussion
    await (supabase.from('community_proposals') as any)
      .update({ has_discussion: true, updated_at: now })
      .eq('id', id);

    return successResponse({ discussion: mapRowToDiscussion(row as Record<string, unknown>) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: Update discussion (creator only) — update date options or schedule meeting
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);
    if (proposal.created_by_member_id !== member.id && !member.is_admin) return errorResponse('Only the proposal creator or admin can manage this discussion', 403);

    const supabase = createServerSupabaseClient();

    const { data: discussion } = await (supabase.from('proposal_discussions') as any)
      .select('*')
      .eq('proposal_id', id)
      .single();

    if (!discussion) return errorResponse('Discussion not found', 404);

    const body = await request.json();
    const now = formatDate();

    // Schedule meeting
    if (body.status === 'scheduled') {
      if (discussion.status !== 'open') return errorResponse('Can only schedule from open status', 400);

      const { meeting_date, meeting_link, invited_emails } = body;
      const meeting_platform = normalizeMeetingPlatform(body.meeting_platform);
      const normalizedMeetingLink = normalizeMeetingLink(meeting_link);

      if (!meeting_date) return errorResponse('Meeting date is required', 400);
      if (!meeting_link) return errorResponse('Meeting link is required', 400);
      if (!normalizedMeetingLink) {
        return errorResponse('Please provide a valid HTTPS meeting link', 400);
      }

      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update({
          status: 'scheduled',
          meeting_date,
          meeting_link: normalizedMeetingLink,
          meeting_platform,
          invited_emails: invited_emails || [],
          updated_at: now,
        })
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to schedule meeting');

      // Once a meeting is scheduled the proposal moves to 'upcoming' and
      // we record the meeting date so listings can sort by "soonest".
      // Only advance from 'published' so we don't clobber later lifecycle
      // states (completed / project_*); next_event_date is always refreshed.
      const propUpdates: Record<string, unknown> = {
        next_event_date: meeting_date,
        updated_at: now,
      };
      if (proposal.status === 'published') {
        propUpdates.status = 'upcoming';
      }
      await (supabase.from('community_proposals') as any)
        .update(propUpdates)
        .eq('id', id);

      // Send email invitations and notifications (non-blocking)
      after(async () => {
        const supabaseAfter = createServerSupabaseClient();

        // Get all responses with member info for notifications
        const { data: responseRows } = await (supabaseAfter.from('proposal_discussion_responses') as any)
          .select('*, members:member_id(id, name, email, locale)')
          .eq('discussion_id', discussion.id);

        const invitedSet = new Set(invited_emails || []);

        for (const resp of responseRows || []) {
          const respMember = resp.members as Record<string, unknown> | null;
          if (!respMember) continue;

          const email = respMember.email as string;
          const name = respMember.name as string;
          const memberId = respMember.id as string;
          const locale = (respMember.locale as string) || 'vi';

          if (!invitedSet.has(email)) continue;

          // Update RSVP status to accepted (they were invited)
          await (supabaseAfter.from('proposal_discussion_responses') as any)
            .update({ rsvp_status: 'accepted', updated_at: formatDate() })
            .eq('id', resp.id);

          // Send email invitation
          try {
            const platformLabels = getMeetingPlatformEmailLabels(meeting_platform, locale as 'vi' | 'en');
            await sendDiscussionInvitationEmail(
              email,
              name,
              proposal.title,
              meeting_date,
              normalizedMeetingLink,
              `/proposals/${proposal.slug || proposal.id}`,
              locale as 'vi' | 'en',
              discussion.id,
              platformLabels,
            );
          } catch (err) {
            console.error(`[email] Discussion invitation failed for ${email}:`, err);
          }

          // In-app notification
          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: proposal.title,
              meetingDate: meeting_date,
            }, locale as 'vi' | 'en');

            await createInAppNotifications({
              type: 'discussion_meeting',
              title: message.title,
              body: message.body,
              url: `/proposals/${proposal.slug || proposal.id}`,
              targetMemberId: memberId,
            });
          } catch (err) {
            console.error(`[notif] Discussion notification failed for ${memberId}:`, err);
          }

          // Push notification
          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: proposal.title,
              meetingDate: meeting_date,
            }, locale as 'vi' | 'en');

            await sendPushToMember(memberId, 'discussion_meeting', {
              ...message,
              url: `/proposals/${proposal.slug || proposal.id}`,
            });
          } catch (err) {
            console.error(`[push] Discussion push failed for ${memberId}:`, err);
          }
        }
      });

      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Send reminder to all invited members
    if (body.action === 'send_reminder') {
      if (discussion.status !== 'scheduled') return errorResponse('Can only send reminders for scheduled discussions', 400);

      // Recipients: every member with a commitment row (interested,
      // will_participate, will_lead). Commenters are still excluded — they
      // never registered any commitment level. We do NOT fall back to
      // discussion.invited_emails.
      const { data: commitmentRows } = await (supabase.from('community_commitments') as any)
        .select('member_id, members:member_id(id, name, email, locale)')
        .eq('proposal_id', id);

      type CommitmentRow = {
        member_id: string;
        members?: { id: string; name: string; email: string; locale: string | null } | null;
      };
      const recipients = (commitmentRows as CommitmentRow[] | null || [])
        .map((r) => r.members)
        .filter((m): m is { id: string; name: string; email: string; locale: string | null } => !!m && !!m.email);

      if (recipients.length === 0) {
        return errorResponse('No committed members to remind', 400);
      }

      after(async () => {
        for (const r of recipients) {
          const mLocale = ((r.locale as string) || 'vi') as 'vi' | 'en';

          try {
            await sendDiscussionReminderEmail(
              r.email,
              r.name,
              proposal.title,
              discussion.meeting_date,
              discussion.meeting_link,
              `/proposals/${proposal.slug || proposal.id}`,
              mLocale,
            );
          } catch (err) {
            console.error(`[email] Manual reminder failed for ${r.email}:`, err);
          }

          try {
            const message = getPushMessage('discussion_meeting', {
              proposalTitle: proposal.title,
              meetingDate: discussion.meeting_date,
              isReminder: 'true',
            }, mLocale);

            await createInAppNotifications({
              type: 'discussion_meeting',
              title: message.title,
              body: message.body,
              url: `/proposals/${proposal.slug || proposal.id}`,
              targetMemberId: r.id,
            });
          } catch (err) {
            console.error(`[notif] Manual reminder notification failed:`, err);
          }
        }
      });

      return successResponse({ message: 'Reminders are being sent', count: recipients.length });
    }

    // Send a custom update email to all invited members
    if (body.action === 'send_update') {
      if (discussion.status !== 'scheduled' && discussion.status !== 'completed') {
        return errorResponse('Can only send updates for scheduled or completed discussions', 400);
      }

      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message) return errorResponse('Update message is required', 400);
      if (message.length > 5000) return errorResponse('Message too long (max 5000 characters)', 400);
      const customSubject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';

      // Recipients: every member with a commitment row, regardless of
      // level (interested / will_participate / will_lead). Commenters are
      // still excluded because they never registered any commitment.
      // We do NOT fall back to discussion.invited_emails.
      const { data: commitmentRows } = await (supabase.from('community_commitments') as any)
        .select('member_id, members:member_id(id, name, email, locale)')
        .eq('proposal_id', id);

      type CommitmentRow = {
        member_id: string;
        members?: { id: string; name: string; email: string; locale: string | null } | null;
      };
      const recipients = (commitmentRows as CommitmentRow[] | null || [])
        .map((r) => r.members)
        .filter((m): m is { id: string; name: string; email: string; locale: string | null } => !!m && !!m.email);

      if (recipients.length === 0) {
        return errorResponse('No committed members to update', 400);
      }

      after(async () => {
        for (const r of recipients) {
          const mLocale = ((r.locale as string) || 'vi') as 'vi' | 'en';

          try {
            await sendDiscussionUpdateEmail(
              r.email,
              r.name,
              proposal.title,
              customSubject,
              message,
              `/proposals/${proposal.slug || proposal.id}`,
              mLocale,
            );
          } catch (err) {
            console.error(`[email] Discussion update failed for ${r.email}:`, err);
          }

          try {
            const inAppTitle = mLocale === 'vi'
              ? `Cập nhật: ${proposal.title}`
              : `Update: ${proposal.title}`;
            const inAppBody = message.length > 140 ? `${message.slice(0, 137)}...` : message;
            await createInAppNotifications({
              type: 'discussion_meeting',
              title: inAppTitle,
              body: inAppBody,
              url: `/proposals/${proposal.slug || proposal.id}`,
              targetMemberId: r.id,
            });
          } catch (err) {
            console.error(`[notif] Discussion update notification failed:`, err);
          }
        }
      });

      return successResponse({ message: 'Updates are being sent', count: recipients.length });
    }

    // Update meeting date/time (reschedule)
    if (body.action === 'update_meeting') {
      if (discussion.status !== 'scheduled') return errorResponse('Can only update scheduled discussions', 400);

      const updates: Record<string, unknown> = { updated_at: now };
      if (body.meeting_date) updates.meeting_date = body.meeting_date;
      if (body.meeting_link) {
        const normalizedLink = normalizeMeetingLink(body.meeting_link);
        if (!normalizedLink) {
          return errorResponse('Please provide a valid HTTPS meeting link', 400);
        }
        updates.meeting_link = normalizedLink;
      }
      if (body.meeting_platform !== undefined) {
        updates.meeting_platform = normalizeMeetingPlatform(body.meeting_platform);
      }

      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update(updates)
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to update meeting');

      // Sync the denormalized next_event_date on the proposal row.
      if (body.meeting_date) {
        await (supabase.from('community_proposals') as any)
          .update({ next_event_date: body.meeting_date, updated_at: now })
          .eq('id', id);
      }

      // Send date change emails to all invited members
      const oldMeetingDate = discussion.meeting_date;
      const effectivePlatform = normalizeMeetingPlatform(
        body.meeting_platform ?? discussion.meeting_platform,
      );
      after(async () => {
        const supabaseAfter = createServerSupabaseClient();
        const invitedEmails: string[] = discussion.invited_emails || [];
        const newMeetingDate = body.meeting_date || oldMeetingDate;
        const newMeetingLink = (updates.meeting_link as string | undefined) || discussion.meeting_link;

        for (const email of invitedEmails) {
          const { data: memberRow } = await (supabaseAfter.from('members') as any)
            .select('id, name, email, locale')
            .eq('email', email)
            .single();

          if (!memberRow) continue;

          try {
            const recipientLocale = (memberRow.locale as string as 'vi' | 'en') || 'vi';
            const platformLabels = getMeetingPlatformEmailLabels(effectivePlatform, recipientLocale);
            await sendDiscussionDateChangeEmail(
              email,
              memberRow.name as string,
              proposal.title,
              oldMeetingDate,
              newMeetingDate,
              newMeetingLink,
              `/proposals/${proposal.slug || proposal.id}`,
              recipientLocale,
              discussion.id,
              platformLabels,
            );
          } catch (err) {
            console.error(`[email] Date change notification failed for ${email}:`, err);
          }
        }
      });

      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Reopen discussion (from completed, cancelled, or scheduled)
    if (body.status === 'open') {
      if (discussion.status !== 'completed' && discussion.status !== 'cancelled' && discussion.status !== 'scheduled') {
        return errorResponse('Can only reopen from completed, cancelled, or scheduled status', 400);
      }
      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update({ status: 'open', meeting_date: null, meeting_link: null, meeting_platform: null, invited_emails: '{}', updated_at: now })
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to reopen discussion');

      // Reopening drops the calendar entry — clear next_event_date and roll
      // 'upcoming' back to 'published'. We do not touch later lifecycle
      // states (completed / project_*).
      const reopenUpdates: Record<string, unknown> = {
        next_event_date: proposal.target_date || null,
        updated_at: now,
      };
      if (proposal.status === 'upcoming') {
        reopenUpdates.status = 'published';
      }
      await (supabase.from('community_proposals') as any)
        .update(reopenUpdates)
        .eq('id', id);

      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Cancel discussion
    if (body.status === 'cancelled') {
      const cancelReason = body.reason || '';

      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to cancel discussion');

      // Cancellation drops the scheduled meeting — fall back to target_date
      // (which can also be null) and roll 'upcoming' back to 'published'.
      const cancelUpdates: Record<string, unknown> = {
        next_event_date: proposal.target_date || null,
        updated_at: now,
      };
      if (proposal.status === 'upcoming') {
        cancelUpdates.status = 'published';
      }
      await (supabase.from('community_proposals') as any)
        .update(cancelUpdates)
        .eq('id', id);

      // Send cancellation emails to all invited members
      if (discussion.invited_emails?.length > 0 && cancelReason && discussion.meeting_date) {
        after(async () => {
          const supabaseAfter = createServerSupabaseClient();
          const invitedEmails: string[] = discussion.invited_emails || [];

          for (const email of invitedEmails) {
            const { data: memberRow } = await (supabaseAfter.from('members') as any)
              .select('id, name, email, locale')
              .eq('email', email)
              .single();

            if (!memberRow) continue;

            try {
              await sendDiscussionCancellationEmail(
                email,
                memberRow.name as string,
                proposal.title,
                discussion.meeting_date,
                cancelReason,
                `/proposals/${proposal.slug || proposal.id}`,
                (memberRow.locale as string as 'vi' | 'en') || 'vi',
              );
            } catch (err) {
              console.error(`[email] Cancellation email failed for ${email}:`, err);
            }
          }
        });
      }

      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Complete discussion
    if (body.status === 'completed') {
      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update({ status: 'completed', updated_at: now })
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to complete discussion');
      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Update title/description (allowed anytime)
    if (body.title !== undefined || body.description !== undefined) {
      const titleDescUpdates: Record<string, unknown> = { updated_at: now };
      if (body.title !== undefined) titleDescUpdates.title = body.title ? String(body.title).trim().slice(0, 200) : null;
      if (body.description !== undefined) titleDescUpdates.description = body.description ? String(body.description).trim().slice(0, 1000) : null;

      // If also updating date_options in the same request
      if (body.date_options && discussion.status === 'open') {
        if (Array.isArray(body.date_options) && body.date_options.length >= 2 && body.date_options.length <= 10) {
          titleDescUpdates.date_options = body.date_options;
        }
      }

      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update(titleDescUpdates)
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to update discussion');
      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    // Update date options (only while open)
    if (body.date_options) {
      if (discussion.status !== 'open') return errorResponse('Can only update date options while discussion is open', 400);

      if (!Array.isArray(body.date_options) || body.date_options.length < 2 || body.date_options.length > 10) {
        return errorResponse('Please provide 2-10 date options', 400);
      }

      const { data: updated, error } = await (supabase.from('proposal_discussions') as any)
        .update({ date_options: body.date_options, updated_at: now })
        .eq('id', discussion.id)
        .select()
        .single();

      if (error) throw new Error('Failed to update date options');
      return successResponse({ discussion: mapRowToDiscussion(updated as Record<string, unknown>) });
    }

    return errorResponse('No valid update provided', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
