import { NextRequest } from 'next/server';
import {
  getMemberById,
  addConnection,
  updateRequestStatus,
  getSheetData,
  SHEETS
} from '@/lib/google-sheets';
import { sendIntroEmail } from '@/lib/resend';
import { notifyAdmin } from '@/lib/discord';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { Connection } from '@/types';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    const authedMember = await requireAuth(request);
    const { request_id, selected_id, match_reason, custom_intro_text, locale = 'en' } = await request.json();

    if (!request_id || !selected_id || !match_reason) {
      return errorResponse('Missing required fields', 400);
    }

    const requests = await getSheetData(SHEETS.REQUESTS);
    const requestRow = requests.find(row => row[0] === request_id);

    // Verify request ownership
    if (requestRow && requestRow[1] !== authedMember.id) {
      return errorResponse('Unauthorized', 403);
    }

    if (!requestRow) {
      return errorResponse('Request not found', 404);
    }

    const requester_id = requestRow[1];
    const request_text = requestRow[2];

    const requester = await getMemberById(requester_id);
    const targetMember = await getMemberById(selected_id);

    if (!requester || !targetMember) {
      return errorResponse('Member not found', 404);
    }

    // Prepare target details - use nickname for dating if available
    const targetName = targetMember.nickname || targetMember.name;
    const targetEmail = targetMember.email;

    // Sanitize custom intro text (prevent XSS in email)
    const sanitizedIntro = custom_intro_text
      ? custom_intro_text.slice(0, 500).replace(/[<>&"']/g, (c: string) =>
          ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
      : undefined;

    await sendIntroEmail({
      requester_email: requester.email,
      requester_name: requester.name,
      requester_role: requester.role,
      requester_company: requester.company,
      target_email: targetEmail,
      target_name: targetName,
      request_text,
      match_reason,
      custom_message: sanitizedIntro,
      locale,
    });

    await updateRequestStatus(request_id, 'connected', selected_id);

    const connection: Connection = {
      id: generateId(),
      request_id,
      from_id: requester_id,
      to_id: selected_id,
      intro_sent: true,
      created_at: formatDate(),
    };

    await addConnection(connection);

    await notifyAdmin('connection_made', {
      from_name: requester.name,
      to_name: targetName,
    });

    return successResponse({
      message: 'Introduction email sent to both parties',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
