import { NextRequest } from 'next/server';
import {
  getMemberById,
  updateRequestStatus,
  getRequestById,
  createContactRequest,
} from '@/lib/supabase-db';
import { sendContactRequestEmail } from '@/lib/resend';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authedMember = await requireAuth(request);
    const { request_id, selected_id, match_reason, custom_intro_text, locale = 'en' } = await request.json();

    if (!request_id || !selected_id || !match_reason) {
      return errorResponse('Missing required fields', 400);
    }

    const connectionRequest = await getRequestById(request_id);

    if (!connectionRequest) {
      return errorResponse('Request not found', 404);
    }

    // Verify request ownership
    if (connectionRequest.requester_id !== authedMember.id) {
      return errorResponse('Unauthorized', 403);
    }

    const requester_id = connectionRequest.requester_id;

    const requester = await getMemberById(requester_id);
    const targetMember = await getMemberById(selected_id);

    if (!requester || !targetMember) {
      return errorResponse('Member not found', 404);
    }

    const targetName = targetMember.nickname || targetMember.name;

    // Sanitize custom intro text (prevent XSS in email)
    const sanitizedMessage = custom_intro_text
      ? custom_intro_text.slice(0, 500).replace(/[<>&"']/g, (c: string) =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
      : (locale === 'vi'
        ? 'Xin chào! Tôi muốn kết nối với bạn qua ABG Alumni Connect.'
        : 'Hello! I would like to connect with you via ABG Alumni Connect.');

    // Create a contact_request with accept/decline token (same flow as Direct Search)
    const token = crypto.randomUUID();
    const contactRequestId = crypto.randomUUID();
    const baseUrl = process.env.NEXTAUTH_URL || 'https://abg-connect.vercel.app';

    await createContactRequest({
      id: contactRequestId,
      requester_id: requester.id,
      target_id: targetMember.id,
      message: sanitizedMessage,
      status: 'pending',
      token,
      created_at: new Date().toISOString(),
      source: 'ai_match',
      connection_request_id: request_id,
    });

    // Send contact request email to target only (with Accept/Refuse buttons)
    try {
      await sendContactRequestEmail({
        target_email: targetMember.email,
        target_name: targetName,
        requester_name: requester.name,
        requester_email: requester.email,
        requester_role: requester.role || '',
        requester_company: requester.company || '',
        message: sanitizedMessage,
        accept_url: `${baseUrl}/api/contact/respond?token=${token}&action=accept`,
        decline_url: `${baseUrl}/api/contact/respond?token=${token}&action=decline`,
      });
    } catch (emailError) {
      console.error('AI match contact request email failed (request still created):', emailError);
    }

    // Update connection request status to 'connected' (intro was sent)
    await updateRequestStatus(request_id, 'connected', selected_id);

    return successResponse({
      message: 'Introduction request sent. The recipient will choose to accept or decline.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
