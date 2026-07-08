import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getAuthenticatedMember } from '@/lib/auth-middleware';
import { getPublishedLibraryItemBySlug } from '@/lib/supabase-library';
import { getMembershipStatus } from '@/types';

function canWatchLibrary(member: NonNullable<Awaited<ReturnType<typeof getAuthenticatedMember>>>): boolean {
  if (member.is_admin) return true;
  const status = getMembershipStatus(member);
  return status === 'premium' || status === 'grace-period';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const member = await getAuthenticatedMember(_request);
    if (!member) {
      return errorResponse('Authentication required', 401);
    }

    const { slug } = await params;
    const item = await getPublishedLibraryItemBySlug(slug);

    if (!item) {
      return errorResponse('Library item not found', 404);
    }

    const canWatch = canWatchLibrary(member);

    return successResponse({
      can_watch: canWatch,
      library_item: {
        ...item,
        can_watch: canWatch,
        drive_preview_url: canWatch ? item.drive_preview_url : undefined,
        canva_embed_url: canWatch ? item.canva_embed_url : undefined,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
