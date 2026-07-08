import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-response';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { updateLibraryItem } from '@/lib/supabase-library';
import { isDriveFolderUrl, normalizeDriveVideoInput } from '@/lib/drive-video';
import { normalizeCanvaVideoInput } from '@/lib/canva-video';

const LibraryStatus = z.enum(['draft', 'published', 'archived']);

const ResourceLinkSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
});

const UpdateLibraryItemSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  event_id: z.string().nullable().optional(),
  proposal_id: z.string().nullable().optional(),
  drive_url: z.string().nullable().optional(),
  drive_file_id: z.string().nullable().optional(),
  canva_url: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  resource_links: z.array(ResourceLinkSchema).max(20).optional(),
  duration_text: z.string().max(80).nullable().optional(),
  speaker_name: z.string().max(160).nullable().optional(),
  recorded_at: z.string().nullable().optional(),
  status: LibraryStatus.optional(),
});

async function requireAdminResponse() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return errorResponse('Authentication required', 401);
  }

  if (!(await isAdminAsync(session.user.email))) {
    return errorResponse('Admin access required', 403);
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdminResponse();
    if (authError) return authError;

    const body = await request.json();
    const parsed = UpdateLibraryItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const { drive_file_id, drive_url, canva_url, ...rest } = parsed.data;
    const updateData: Parameters<typeof updateLibraryItem>[1] = { ...rest };
    const driveInput = drive_file_id ?? drive_url;
    if (driveInput !== undefined) {
      if (!driveInput) {
        updateData.drive_file_id = null;
        updateData.drive_preview_url = null;
      } else {
        const drive = normalizeDriveVideoInput(driveInput);
        if (!drive) {
          if (isDriveFolderUrl(driveInput)) {
            return errorResponse('This is a folder link. Please paste a link to a specific video file inside the folder (Share → Copy link on the file).', 400);
          }
          return errorResponse('Invalid Google Drive file link or ID', 400);
        }
        updateData.drive_file_id = drive.fileId;
        updateData.drive_preview_url = drive.previewUrl;
      }
    }

    if (canva_url !== undefined) {
      if (!canva_url) {
        updateData.canva_embed_url = null;
      } else {
        const canva = await normalizeCanvaVideoInput(canva_url);
        if (!canva) {
          return errorResponse('Invalid Canva video link. Paste the "Public view link" from Canva (canva.link/… or canva.com/design/…/watch).', 400);
        }
        updateData.canva_embed_url = canva.embedUrl;
      }
    }

    const { id } = await params;
    const item = await updateLibraryItem(id, updateData);
    return successResponse({ library_item: item });
  } catch (error) {
    return handleApiError(error);
  }
}
