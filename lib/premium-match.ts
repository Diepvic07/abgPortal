import { getMembers } from '@/lib/supabase-db';
import { findMatches } from '@/lib/gemini';
import type { Member } from '@/types';

export interface PremiumMatchData {
  name: string;
  role: string;
  company: string;
  match_score: number;
  reason: string;
}

export type PremiumMatchResult =
  | { status: 'success'; matches: PremiumMatchData[] }
  | { status: 'profile_incomplete' }
  | { status: 'no_quality_matches' };

/**
 * Generate top 5 AI matches for a newly upgraded Premium member.
 * Returns status-based result so caller knows which email to send.
 */
export async function generatePremiumMatches(member: Member): Promise<PremiumMatchResult> {
  // Profile gate: need at least looking_for OR expertise
  if (!member.looking_for && !member.expertise) {
    console.log(`[PremiumMatch] Skipping: member ${member.id} has no looking_for/expertise`);
    return { status: 'profile_incomplete' };
  }

  // Fetch and filter candidates (same pattern as request/route.ts)
  const allMembers = await getMembers();
  let candidates = allMembers.filter(m => m.id !== member.id && m.status === 'active');

  // Cap at 200 by profile completeness
  if (candidates.length > 200) {
    candidates = candidates
      .sort((a, b) => {
        const sa = (a.expertise ? 1 : 0) + (a.bio ? 1 : 0) + (a.can_help_with ? 1 : 0);
        const sb = (b.expertise ? 1 : 0) + (b.bio ? 1 : 0) + (b.can_help_with ? 1 : 0);
        return sb - sa;
      })
      .slice(0, 200);
  }

  // Build request text from profile
  const requestText = member.looking_for
    || `Find professional connections for ${member.name}, ${member.role} at ${member.company}. Expertise: ${member.expertise || 'general'}`;

  const locale = member.locale || 'vi';
  const matches = await findMatches(
    requestText,
    candidates.map(m => ({
      id: m.id,
      name: m.name,
      gender: m.gender,
      expertise: m.expertise,
      can_help_with: m.can_help_with,
      bio: m.bio,
      job_preferences: m.job_preferences,
      hiring_preferences: m.hiring_preferences,
    })),
    locale,
  );

  // Sort by score desc, take top 5
  const top5 = matches
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);

  // Quality gate: top match must be >= 60
  if (top5.length === 0 || top5[0].match_score < 60) {
    console.log(`[PremiumMatch] No quality matches: top score ${top5[0]?.match_score ?? 0} < 60`);
    return { status: 'no_quality_matches' };
  }

  // Enrich with member details, filter out hallucinated IDs
  const enriched: PremiumMatchData[] = top5
    .map(match => {
      const m = candidates.find(c => c.id === match.id);
      if (!m) return null;
      return {
        name: m.name,
        role: m.role || '',
        company: m.company || '',
        match_score: match.match_score,
        reason: match.reason,
      };
    })
    .filter((x): x is PremiumMatchData => x !== null);

  if (enriched.length === 0) {
    return { status: 'no_quality_matches' };
  }

  return { status: 'success', matches: enriched };
}
