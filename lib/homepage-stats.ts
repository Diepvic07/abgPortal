import { createServerSupabaseClient } from './supabase/server';

export interface HomepageStats {
  alumniCount: number;
  countriesCount: number;
  expertiseCount: number;
}

export interface FeaturedMember {
  name: string;
  role: string;
  company: string;
  avatar_url: string;
}

/** Fetch approved members who have avatar photos for hero display */
export async function getFeaturedMemberAvatars(limit = 6): Promise<FeaturedMember[]> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from('members')
    .select('name, role, company, avatar_url')
    .eq('approval_status', 'approved')
    .not('avatar_url', 'is', null)
    .neq('avatar_url', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []) as FeaturedMember[];
}

export async function getHomepageStats(): Promise<HomepageStats> {
  const db = createServerSupabaseClient();

  const [alumniResult, countriesResult, expertiseResult] = await Promise.all([
    db.from('members')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved'),
    db.from('members')
      .select('country')
      .eq('approval_status', 'approved')
      .not('country', 'is', null)
      .neq('country', ''),
    db.from('members')
      .select('expertise')
      .eq('approval_status', 'approved')
      .not('expertise', 'is', null)
      .neq('expertise', ''),
  ]);

  const uniqueCountries = new Set(
    countriesResult.data?.map(r => r.country).filter(Boolean)
  );
  const uniqueExpertise = new Set(
    expertiseResult.data?.map(r => r.expertise).filter(Boolean)
  );

  return {
    alumniCount: alumniResult.count || 0,
    countriesCount: uniqueCountries.size,
    expertiseCount: uniqueExpertise.size,
  };
}
