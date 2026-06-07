import { LibraryItem, LibraryItemStatus, LibraryResourceLink } from '@/types';
import { createServerSupabaseClient } from './supabase/server';
import { generateId, formatDate, generateSlug } from '@/lib/utils';

const LIBRARY_SELECT = `
  *,
  event:community_events(id, title, slug)
`;

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

function parseResourceLinks(value: unknown): LibraryResourceLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const link = item as Record<string, unknown>;
      const label = typeof link.label === 'string' ? link.label.trim() : '';
      const url = typeof link.url === 'string' ? link.url.trim() : '';
      return label && url ? { label, url } : null;
    })
    .filter((item): item is LibraryResourceLink => Boolean(item));
}

function mapRowToLibraryItem(row: Record<string, unknown>): LibraryItem {
  const event = row.event as Record<string, unknown> | null;

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    event_id: nullToUndefined(row.event_id as string | null),
    drive_file_id: nullToUndefined(row.drive_file_id as string | null),
    drive_preview_url: nullToUndefined(row.drive_preview_url as string | null),
    thumbnail_url: nullToUndefined(row.thumbnail_url as string | null),
    resource_links: parseResourceLinks(row.resource_links),
    duration_text: nullToUndefined(row.duration_text as string | null),
    speaker_name: nullToUndefined(row.speaker_name as string | null),
    recorded_at: nullToUndefined(row.recorded_at as string | null),
    status: (row.status as LibraryItemStatus) || 'draft',
    visibility: 'premium',
    created_by_member_id: row.created_by_member_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    published_at: nullToUndefined(row.published_at as string | null),
    event_title: event && typeof event.title === 'string' ? event.title : undefined,
    event_slug: event && typeof event.slug === 'string' ? event.slug : undefined,
  };
}

export async function getPublishedLibraryItems(options?: {
  eventId?: string;
}): Promise<LibraryItem[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('library_items')
    .select(LIBRARY_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (options?.eventId) {
    query = query.eq('event_id', options.eventId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching published library items:', error);
    throw new Error('Failed to fetch library items');
  }

  return (data || []).map((row: Record<string, unknown>) => mapRowToLibraryItem(row));
}

export async function getPublishedLibraryItemBySlug(slug: string): Promise<LibraryItem | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('library_items')
    .select(LIBRARY_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('Error fetching library item by slug:', error);
    throw new Error('Failed to fetch library item');
  }

  return data ? mapRowToLibraryItem(data as Record<string, unknown>) : null;
}

export async function getAllLibraryItems(): Promise<LibraryItem[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('library_items')
    .select(LIBRARY_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all library items:', error);
    throw new Error('Failed to fetch library items');
  }

  return (data || []).map((row: Record<string, unknown>) => mapRowToLibraryItem(row));
}

export async function createLibraryItem(data: {
  title: string;
  description: string;
  event_id?: string | null;
  drive_file_id?: string | null;
  drive_preview_url?: string | null;
  thumbnail_url?: string | null;
  resource_links?: LibraryResourceLink[];
  duration_text?: string | null;
  speaker_name?: string | null;
  recorded_at?: string | null;
  status?: LibraryItemStatus;
  created_by_member_id: string;
}): Promise<LibraryItem> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();
  const status = data.status || 'draft';

  const { data: row, error } = await supabase
    .from('library_items')
    .insert({
      id: generateId(),
      slug: generateSlug(data.title),
      title: data.title,
      description: data.description,
      event_id: data.event_id || null,
      drive_file_id: data.drive_file_id || null,
      drive_preview_url: data.drive_preview_url || null,
      thumbnail_url: data.thumbnail_url || null,
      resource_links: data.resource_links || [],
      duration_text: data.duration_text || null,
      speaker_name: data.speaker_name || null,
      recorded_at: data.recorded_at || null,
      status,
      visibility: 'premium',
      created_by_member_id: data.created_by_member_id,
      created_at: now,
      updated_at: now,
      published_at: status === 'published' ? now : null,
    } as never)
    .select(LIBRARY_SELECT)
    .single();

  if (error) {
    console.error('Error creating library item:', error);
    throw new Error('Failed to create library item');
  }

  return mapRowToLibraryItem(row as Record<string, unknown>);
}

export async function updateLibraryItem(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    event_id: string | null;
    drive_file_id: string | null;
    drive_preview_url: string | null;
    thumbnail_url: string | null;
    resource_links: LibraryResourceLink[];
    duration_text: string | null;
    speaker_name: string | null;
    recorded_at: string | null;
    status: LibraryItemStatus;
  }>,
): Promise<LibraryItem> {
  const supabase = createServerSupabaseClient();
  const now = formatDate();

  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: now,
  };

  if (data.title) {
    updateData.slug = generateSlug(data.title);
  }

  if (data.status === 'published') {
    updateData.published_at = now;
  } else if (data.status === 'draft' || data.status === 'archived') {
    updateData.published_at = null;
  }

  const { data: row, error } = await supabase
    .from('library_items')
    .update(updateData as never)
    .eq('id', id)
    .select(LIBRARY_SELECT)
    .single();

  if (error) {
    console.error('Error updating library item:', error);
    throw new Error('Failed to update library item');
  }

  return mapRowToLibraryItem(row as Record<string, unknown>);
}
