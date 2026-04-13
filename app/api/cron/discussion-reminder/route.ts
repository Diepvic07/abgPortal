import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import { sendDiscussionReminderEmail } from '@/lib/resend';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Find scheduled meetings starting within the next 10 minutes that haven't been reminded
    const { data: discussions } = await (supabase.from('proposal_discussions') as any)
      .select('id, meeting_date, meeting_link, reminder_sent, proposal_id')
      .eq('status', 'scheduled')
      .eq('reminder_sent', false)
      .lte('meeting_date', tenMinutesFromNow.toISOString())
      .gte('meeting_date', now.toISOString());

    if (!discussions || discussions.length === 0) {
      return NextResponse.json({ message: 'No upcoming meetings to remind', count: 0 });
    }

    let remindedCount = 0;

    for (const disc of discussions) {
      // Fetch proposal title
      const { data: proposal } = await (supabase.from('community_proposals') as any)
        .select('id, title, slug')
        .eq('id', disc.proposal_id)
        .single();

      if (!proposal) continue;

      const proposalTitle = proposal.title as string;
      const proposalSlug = (proposal.slug as string) || (proposal.id as string);

      // Get accepted responses with member info
      const { data: responses } = await (supabase.from('proposal_discussion_responses') as any)
        .select('*, members:member_id(id, name, email, locale)')
        .eq('discussion_id', disc.id)
        .eq('rsvp_status', 'accepted');

      for (const resp of responses || []) {
        const respMember = resp.members as Record<string, unknown> | null;
        if (!respMember) continue;

        const memberId = respMember.id as string;
        const name = respMember.name as string;
        const email = respMember.email as string;
        const locale = (respMember.locale as string) || 'vi';

        // Send reminder email
        try {
          await sendDiscussionReminderEmail(
            email,
            name,
            proposalTitle,
            disc.meeting_date,
            disc.meeting_link,
            `/proposals/${proposalSlug}`,
            locale as 'vi' | 'en',
          );
        } catch (err) {
          console.error(`[cron] Reminder email failed for ${email}:`, err);
        }

        // In-app notification
        try {
          const message = getPushMessage('discussion_meeting', {
            proposalTitle,
            meetingDate: disc.meeting_date,
            isReminder: 'true',
          }, locale as 'vi' | 'en');

          await createInAppNotifications({
            type: 'discussion_meeting',
            title: message.title,
            body: message.body,
            url: `/proposals/${proposalSlug}`,
            targetMemberId: memberId,
          });
        } catch (err) {
          console.error(`[cron] Reminder in-app notification failed for ${memberId}:`, err);
        }

        // Push notification
        try {
          const message = getPushMessage('discussion_meeting', {
            proposalTitle,
            meetingDate: disc.meeting_date,
            isReminder: 'true',
          }, locale as 'vi' | 'en');

          await sendPushToMember(memberId, 'discussion_meeting', {
            ...message,
            url: `/proposals/${proposalSlug}`,
          });
        } catch (err) {
          console.error(`[cron] Reminder push failed for ${memberId}:`, err);
        }
      }

      // Mark reminder as sent
      await (supabase.from('proposal_discussions') as any)
        .update({ reminder_sent: true })
        .eq('id', disc.id);

      remindedCount++;
    }

    return NextResponse.json({
      message: `Sent reminders for ${remindedCount} meeting(s)`,
      count: remindedCount,
    });
  } catch (error) {
    console.error('Discussion reminder cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
