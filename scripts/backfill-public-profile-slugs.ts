import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateProfileSlug } from '../lib/profile-url';

const DRY_RUN = process.argv.includes('--dry-run');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface MemberRow {
  id: string;
  name: string | null;
  public_profile_slug: string | null;
}

async function main() {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, public_profile_slug')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load members: ${error.message}`);
  }

  const members = (data || []) as MemberRow[];
  const desiredBySlug = new Map<string, string>();
  const collisions: Array<{ id: string; slug: string }> = [];

  for (const member of members) {
    const nextSlug = generateProfileSlug(member.name, member.id);
    const existingId = desiredBySlug.get(nextSlug);
    if (existingId && existingId !== member.id) {
      collisions.push({ id: member.id, slug: nextSlug });
      continue;
    }
    desiredBySlug.set(nextSlug, member.id);
  }

  if (collisions.length > 0) {
    console.error('Slug collisions detected. Aborting.');
    for (const collision of collisions.slice(0, 20)) {
      console.error(`- ${collision.slug} (${collision.id})`);
    }
    process.exit(1);
  }

  const updates = members
    .map((member) => ({
      id: member.id,
      current: member.public_profile_slug,
      next: generateProfileSlug(member.name, member.id),
    }))
    .filter((row) => row.current !== row.next);

  console.log(`Members scanned: ${members.length}`);
  console.log(`Slug updates needed: ${updates.length}`);

  if (updates.length === 0 || DRY_RUN) {
    if (DRY_RUN && updates.length > 0) {
      for (const update of updates.slice(0, 20)) {
        console.log(`${update.id}: ${update.current || '(empty)'} -> ${update.next}`);
      }
    }
    return;
  }

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('members')
      .update({ public_profile_slug: update.next })
      .eq('id', update.id);

    if (updateError) {
      throw new Error(`Failed to update ${update.id}: ${updateError.message}`);
    }
  }

  console.log(`Updated ${updates.length} member slugs.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
