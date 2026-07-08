import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { errorResponse, handleApiError, successResponse } from '@/lib/api-response';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { getMemberByEmail } from '@/lib/supabase-db';
import { createLibraryItem, getAllLibraryItems } from '@/lib/supabase-library';
import { isDriveFolderUrl, normalizeDriveVideoInput } from '@/lib/drive-video';
import { normalizeCanvaVideoInput } from '@/lib/canva-video';

const LibraryStatus = z.enum(['draft', 'published', 'archived']);

const ResourceLinkSchema = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
});

const CreateLibraryItemSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
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
  status: LibraryStatus.optional().default('draft'),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: errorResponse('Authentication required', 401) };
  }

  if (!(await isAdminAsync(session.user.email))) {
    return { error: errorResponse('Admin access required', 403) };
  }

  const member = await getMemberByEmail(session.user.email);
  if (!member) {
    return { error: errorResponse('Member not found', 404) };
  }

  return { member };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const libraryItems = await getAllLibraryItems();
    return successResponse({ library_items: libraryItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = CreateLibraryItemSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues.map((e) => e.message).join(', '), 400);
    }

    const driveInput = parsed.data.drive_file_id || parsed.data.drive_url || '';
    const drive = driveInput ? normalizeDriveVideoInput(driveInput) : null;
    if (driveInput && !drive) {
      if (isDriveFolderUrl(driveInput)) {
        return errorResponse('This is a folder link. Please paste a link to a specific video file inside the folder (Share → Copy link on the file).', 400);
      }
      return errorResponse('Invalid Google Drive file link or ID', 400);
    }

    const canvaInput = parsed.data.canva_url || '';
    const canva = canvaInput ? await normalizeCanvaVideoInput(canvaInput) : null;
    if (canvaInput && !canva) {
      return errorResponse('Invalid Canva video link. Paste the "Public view link" from Canva (canva.link/… or canva.com/design/…/watch).', 400);
    }

    const item = await createLibraryItem({
      title: parsed.data.title,
      description: parsed.data.description,
      event_id: parsed.data.event_id || null,
      proposal_id: parsed.data.proposal_id || null,
      drive_file_id: drive?.fileId || null,
      drive_preview_url: drive?.previewUrl || null,
      canva_embed_url: canva?.embedUrl || null,
      thumbnail_url: parsed.data.thumbnail_url || null,
      resource_links: parsed.data.resource_links || [],
      duration_text: parsed.data.duration_text || null,
      speaker_name: parsed.data.speaker_name || null,
      recorded_at: parsed.data.recorded_at || null,
      status: parsed.data.status,
      created_by_member_id: auth.member.id,
    });

    return successResponse({ library_item: item }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
