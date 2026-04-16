import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Extract member IDs from markdown-style profile links in article content.
 * Matches `[@Name](/profile/<slug-or-id>)` and resolves each slug to a member id.
 * Returns a de-duplicated list of member IDs.
 */
export async function extractContentMentionMemberIds(
  ...contents: Array<string | null | undefined>
): Promise<string[]> {
  const slugs = new Set<string>();
  const linkRe = /\[@[^\]]+\]\(\/profile\/([^)\s]+)\)/g;

  for (const text of contents) {
    if (!text) continue;
    let match;
    while ((match = linkRe.exec(text)) !== null) {
      const s = match[1];
      if (s) slugs.add(s);
    }
  }

  if (slugs.size === 0) return [];

  const list = [...slugs];
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const uuidInputs = list.filter((s) => uuidRe.test(s));
  const slugInputs = list.filter((s) => !uuidRe.test(s));

  const supabase = createServerSupabaseClient();
  const resolved = new Set<string>(uuidInputs);

  if (slugInputs.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('members') as any)
      .select('id')
      .in('public_profile_slug', slugInputs);
    for (const row of (data || []) as Array<{ id: string }>) {
      resolved.add(row.id);
    }
  }

  return [...resolved];
}
