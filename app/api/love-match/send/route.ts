import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getMemberById, createLoveMatchRequest } from '@/lib/supabase-db';
import { canMakeRequest } from '@/lib/tier-utils';
import { isDatingProfileComplete } from '@/lib/dating-utils';
import { sendLoveMatchNotificationEmail } from '@/lib/resend';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { LoveMatchRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const { request_id, to_id } = await request.json();

    if (!request_id || !to_id) {
      return errorResponse('Missing required fields: request_id, to_id', 400);
    }

    // Check tier limits
    const requestStatus = canMakeRequest(member);
    if (!requestStatus.allowed) {
      if (requestStatus.reason === 'not_approved') {
        return errorResponse('Your account is pending approval.', 403);
      }
      if (requestStatus.reason === 'account_suspended') {
        return errorResponse('Your account has been suspended.', 403);
      }
      if (requestStatus.reason === 'limit_reached') {
        return errorResponse('Request limit reached. Upgrade to premium for more requests.', 403);
      }
    }

    // Check dating profile completeness
    const profileCheck = isDatingProfileComplete(member);
    if (!profileCheck.complete) {
      return errorResponse(
        `Please complete your dating profile before sending a love match. Missing: ${profileCheck.missingFields.join(', ')}`,
        400
      );
    }

    // Fetch target member
    const target = await getMemberById(to_id);
    if (!target) {
      return errorResponse('Target member not found', 404);
    }

    // Build shared profile snapshots (anonymous — no name/contact/employer)
    const fromProfileShared = JSON.stringify({
      nickname: member.nickname || '',
      gender: member.gender || '',
      country: member.country || '',
      self_description: member.self_description || '',
      interests: member.interests || '',
      core_values: member.core_values || '',
      ideal_day: member.ideal_day || '',
    });

    const toProfileShared = JSON.stringify({
      nickname: target.nickname || '',
      gender: target.gender || '',
      country: target.country || '',
      self_description: target.self_description || '',
      interests: target.interests || '',
      core_values: target.core_values || '',
      ideal_day: target.ideal_day || '',
    });

    const loveMatchId = `lm_${generateId()}`;

    const loveMatchRequest: LoveMatchRequest = {
      id: loveMatchId,
      request_id,
      from_id: member.id,
      to_id,
      status: 'pending',
      from_profile_shared: fromProfileShared,
      to_profile_shared: toProfileShared,
      created_at: formatDate(),
    };

    await createLoveMatchRequest(loveMatchRequest);

    // Notify target via email (anonymous snippet)
    const fromProfile = JSON.parse(fromProfileShared);
    try {
      await sendLoveMatchNotificationEmail(target.email, {
        interests: fromProfile.interests,
        core_values: fromProfile.core_values,
        self_description: fromProfile.self_description,
      });
    } catch (emailErr) {
      console.error('Love match notification email failed (non-fatal):', emailErr);
    }

    return successResponse({
      love_match_id: loveMatchId,
      message: 'Love match request sent successfully',
      warning: requestStatus.warning,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
