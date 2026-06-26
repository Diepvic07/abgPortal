import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getAuthenticatedMember } from '@/lib/auth-middleware';
import { getPublishedLibraryItems } from '@/lib/supabase-library';
import { getMembershipStatus } from '@/types';

function canWatchLibrary(member: NonNullable<Awaited<ReturnType<typeof getAuthenticatedMember>>>): boolean {
  if (member.is_admin) return true;
  const status = getMembershipStatus(member);
  return status === 'premium' || status === 'grace-period';
}

export async function GET(request: NextRequest) {
  try {
    const member = await getAuthenticatedMember(request);
    if (!member) {
      return errorResponse('Authentication required', 401);
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id') || undefined;
    const proposalId = searchParams.get('proposal_id') || undefined;
    const canWatch = canWatchLibrary(member);
    const items = await getPublishedLibraryItems({ eventId, proposalId });

    return successResponse({
      can_watch: canWatch,
      library_items: items.map((item) => ({
        ...item,
        can_watch: canWatch,
        drive_preview_url: canWatch ? item.drive_preview_url : undefined,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
