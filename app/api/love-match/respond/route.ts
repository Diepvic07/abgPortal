import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getLoveMatchRequestById, updateLoveMatchRequest, getMemberById } from '@/lib/supabase-db';
import { sendLoveMatchAcceptEmail } from '@/lib/resend';
import { formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const { love_match_id, action } = await request.json();

    if (!love_match_id || !action) {
      return errorResponse('Missing required fields: love_match_id, action', 400);
    }

    if (action !== 'accept' && action !== 'refuse') {
      return errorResponse('Action must be "accept" or "refuse"', 400);
    }

    const loveMatch = await getLoveMatchRequestById(love_match_id);
    if (!loveMatch) {
      return errorResponse('Love match request not found', 404);
    }

    // Only the target can respond
    if (loveMatch.to_id !== member.id) {
      return errorResponse('Unauthorized: you are not the recipient of this request', 403);
    }

    if (loveMatch.status !== 'pending') {
      return errorResponse(`This request has already been ${loveMatch.status}`, 400);
    }

    const resolvedAt = formatDate();

    if (action === 'accept') {
      await updateLoveMatchRequest(love_match_id, {
        status: 'accepted',
        resolved_at: resolvedAt,
      });

      // Fetch both members for full reveal email
      const fromMember = await getMemberById(loveMatch.from_id);
      if (fromMember) {
        try {
          await sendLoveMatchAcceptEmail({
            from_email: fromMember.email,
            from_name: fromMember.name,
            from_role: fromMember.role,
            from_company: fromMember.company,
            from_phone: fromMember.phone,
            from_linkedin: fromMember.linkedin_url,
            to_email: member.email,
            to_name: member.name,
            to_role: member.role,
            to_company: member.company,
            to_phone: member.phone,
            to_linkedin: member.linkedin_url,
            locale: member.locale || 'vi',
          });
        } catch (emailErr) {
          console.error('Love match accept email failed (non-fatal):', emailErr);
        }
      }

      return successResponse({ message: 'Love match accepted! Introduction emails sent to both parties.' });
    }

    // action === 'refuse'
    await updateLoveMatchRequest(love_match_id, {
      status: 'refused',
      resolved_at: resolvedAt,
    });

    // No email to searcher on refuse (privacy)
    return successResponse({ message: 'Love match request declined.' });
  } catch (error) {
    return handleApiError(error);
  }
}
