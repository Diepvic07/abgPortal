import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getLoveMatchRequestsByUserId, updateLoveMatchRequest } from '@/lib/google-sheets';
import { formatDate } from '@/lib/utils';
import { successResponse, handleApiError } from '@/lib/api-response';
import { LoveMatchRequest } from '@/types';

const TIMEOUT_DAYS = 3;

function isTimedOut(loveMatch: LoveMatchRequest): boolean {
  if (!loveMatch.viewed_at) return false;
  const viewedAt = new Date(loveMatch.viewed_at).getTime();
  const now = Date.now();
  const diffDays = (now - viewedAt) / (1000 * 60 * 60 * 24);
  return diffDays > TIMEOUT_DAYS;
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);
    const allRequests = await getLoveMatchRequestsByUserId(member.id);

    const now = formatDate();
    const updatePromises: Promise<unknown>[] = [];

    // Process auto-timeout and first-view tracking
    const processed = allRequests.map(lm => {
      // Auto-timeout: pending + viewed > 3 days ago
      if (lm.status === 'pending' && lm.to_id === member.id && isTimedOut(lm)) {
        updatePromises.push(
          updateLoveMatchRequest(lm.id, { status: 'ignored' })
        );
        return { ...lm, status: 'ignored' as const };
      }

      // First view: incoming pending request with no viewed_at
      if (lm.status === 'pending' && lm.to_id === member.id && !lm.viewed_at) {
        updatePromises.push(
          updateLoveMatchRequest(lm.id, { viewed_at: now })
        );
        return { ...lm, viewed_at: now };
      }

      return lm;
    });

    // Fire updates in background (non-blocking for response)
    Promise.all(updatePromises).catch(err =>
      console.error('Love match update error (non-fatal):', err)
    );

    const outgoing = processed.filter(lm => lm.from_id === member.id);
    const incoming = processed.filter(lm => lm.to_id === member.id);

    return successResponse({ outgoing, incoming });
  } catch (error) {
    return handleApiError(error);
  }
}
