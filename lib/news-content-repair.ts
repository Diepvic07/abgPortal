import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Rewrites `[@Name](/profile/<x>)` links in article content so they always
 * resolve to an existing member. Works server-side and returns a new string.
 *
 * Lookup strategies (in order): exact id, exact public_profile_slug,
 * public_profile_slug suffix match. Once resolved, the link is rewritten to
 * /profile/<uuid>. Unresolvable links are left untouched.
 */
export async function repairProfileLinksInContent(
  ...contents: Array<string | null | undefined>
): Promise<string[]> {
  const linkRe = /\[@[^\]]+\]\(\/profile\/([^)\s]+)\)/g;

  // Collect unique identifiers across all inputs
  const identifiers = new Set<string>();
  for (const text of contents) {
    if (!text) continue;
    let match;
    while ((match = linkRe.exec(text)) !== null) {
      if (match[1]) identifiers.add(match[1]);
    }
  }

  if (identifiers.size === 0) {
    return contents.map((c) => c ?? '');
  }

  const list = [...identifiers];
  const supabase = createServerSupabaseClient();

  // Strategy 1: exact id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: byIdRows } = await (supabase.from('members') as any)
    .select('id, public_profile_slug')
    .in('id', list);

  // Strategy 2: exact public_profile_slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bySlugRows } = await (supabase.from('members') as any)
    .select('id, public_profile_slug')
    .in('public_profile_slug', list);

  const resolved = new Map<string, string>(); // identifier -> canonical member id
  for (const row of (byIdRows || []) as Array<{ id: string }>) {
    resolved.set(row.id, row.id);
  }
  for (const row of (bySlugRows || []) as Array<{ id: string; public_profile_slug: string }>) {
    resolved.set(row.public_profile_slug, row.id);
  }

  // Strategy 3: suffix match for anything still unresolved.
  // Covers old-style URLs like `/profile/<5-or-8-char-suffix>` that pointed to a
  // slug like `nguyen-ngoc-quang-<suffix>`.
  const unresolved = list.filter((s) => !resolved.has(s));
  for (const s of unresolved) {
    if (s.length < 3) continue; // too short to disambiguate safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: suffixRows } = await (supabase.from('members') as any)
      .select('id, public_profile_slug')
      .like('public_profile_slug', `%-${s}`)
      .limit(2);
    const rows = (suffixRows || []) as Array<{ id: string }>;
    // Only accept a suffix hit if it's unambiguous.
    if (rows.length === 1) {
      resolved.set(s, rows[0].id);
    }
  }

  if (resolved.size === 0) {
    return contents.map((c) => c ?? '');
  }

  return contents.map((text) => {
    if (!text) return '';
    return text.replace(linkRe, (full, slug: string) => {
      const memberId = resolved.get(slug);
      if (!memberId || memberId === slug) return full;
      // Reconstruct with the canonical member id so the link always resolves.
      return full.replace(`/profile/${slug}`, `/profile/${memberId}`);
    });
  });
}
