import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendProjectUpdateEmail } from '@/lib/resend';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { isProjectStatus } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MESSAGE_MAX = 5000;
const SUBJECT_MAX = 200;

// POST: send a custom update email + in-app notification to every joined
//       project member. Creator or admin only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    const isCreator = proposal.created_by_member_id === member.id;
    const isAdmin = !!member.is_admin;
    if (!isCreator && !isAdmin) {
      return errorResponse('Only the project creator or admin can send updates', 403);
    }

    if (!isProjectStatus(proposal.status)) {
      return errorResponse('Updates can only be sent from a project', 400);
    }

    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return errorResponse('Update message is required', 400);
    if (message.length > MESSAGE_MAX) return errorResponse(`Message too long (max ${MESSAGE_MAX} characters)`, 400);
    const customSubject = typeof body.subject === 'string' ? body.subject.trim().slice(0, SUBJECT_MAX) : '';

    const supabase = createServerSupabaseClient();

    const { data: memberRows } = await (supabase.from('proposal_project_members') as any)
      .select('member_id, members:member_id(id, name, email, locale)')
      .eq('proposal_id', id);

    type MemberRow = {
      member_id: string;
      members?: { id: string; name: string; email: string; locale: string | null } | null;
    };

    const recipients = (memberRows as MemberRow[] | null || [])
      .map((r) => r.members)
      .filter((m): m is { id: string; name: string; email: string; locale: string | null } => !!m);

    if (recipients.length === 0) {
      return errorResponse('No project members to update', 400);
    }

    const proposalUrl = `/proposals/${proposal.slug || proposal.id}`;

    after(async () => {
      for (const r of recipients) {
        const mLocale = ((r.locale as string) || 'vi') as 'vi' | 'en';
        try {
          await sendProjectUpdateEmail(
            r.email,
            r.name,
            proposal.title,
            customSubject,
            message,
            proposalUrl,
            mLocale,
          );
        } catch (err) {
          console.error(`[email] Project update failed for ${r.email}:`, err);
        }

        const inAppTitle = mLocale === 'vi'
          ? `Cập nhật dự án: ${proposal.title}`
          : `Project update: ${proposal.title}`;
        const inAppBody = message.length > 140 ? `${message.slice(0, 137)}...` : message;

        try {
          await createInAppNotifications({
            type: 'discussion_meeting',
            title: inAppTitle,
            body: inAppBody,
            url: proposalUrl,
            targetMemberId: r.id,
          });
        } catch (err) {
          console.error(`[notif] Project update notification failed:`, err);
        }

        try {
          const pushMessage = getPushMessage('project_update', {
            proposalTitle: proposal.title,
            customSubject,
            preview: inAppBody,
          }, mLocale);

          await sendPushToMember(r.id, 'project_update', {
            ...pushMessage,
            url: proposalUrl,
          });
        } catch (err) {
          console.error(`[push] Project update push failed for ${r.id}:`, err);
        }
      }
    });

    return successResponse({ message: 'Updates are being sent', count: recipients.length });
  } catch (error) {
    return handleApiError(error);
  }
}
