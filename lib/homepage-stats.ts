import { createServerSupabaseClient } from './supabase/server';

export interface HomepageStats {
  alumniCount: number;
  countriesCount: number;
  expertiseCount: number;
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
