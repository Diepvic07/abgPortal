import { NextRequest } from 'next/server';
import { findMatches } from '@/lib/gemini';
import { getMembers, addRequest, updateMemberFreeRequests, incrementMemberRequestCounts, incrementMemberMonthlyRequests, addRequestAudit } from '@/lib/supabase-db';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getTranslations, type Locale } from '@/lib/i18n';
import { ConnectionRequest, RequestCategory } from '@/types';
import { requireAuth } from '@/lib/auth-middleware';
import { checkForAbuse } from '@/lib/abuse-detection';
import { canMakeRequest, getMemberTier, createBlurredMatch, TIER_LIMITS } from '@/lib/tier-utils';

export async function POST(request: NextRequest) {
  try {
    // Require authentication - get authenticated member
    const requester = await requireAuth(request);

    const body = await request.json();
    const request_text = body.request_text;
    const locale = body.locale || 'en';
    // Support both legacy 'type' and new 'category' field
    const category: RequestCategory = body.category || (body.type === 'dating' ? 'love' : body.type === 'professional' ? 'partner' : body.type) || 'partner';
    // Map category to internal type for Gemini
    const type = category === 'love' ? 'dating' : category === 'partner' ? 'professional' : category;
    const t = getTranslations(locale as Locale);

    if (!request_text) {
      return errorResponse('Missing required fields', 400);
    }

    // Check for abuse
    const abuse = await checkForAbuse(requester.id, request_text);
    if (abuse.shouldSuspend) {
      console.warn(`[Abuse] Account flagged for: ${abuse.reason}`, { member: requester.name });
    }

    // Audit helper
    const logAudit = async (success: boolean, failure_reason?: string, request_id?: string) => {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await addRequestAudit({
        id: generateId(),
        member_id: requester.id,
        request_id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: formatDate(),
        success,
        failure_reason,
        request_type: type,
      });
    };

    // Check account status
    if (requester.account_status === 'suspended') {
      const reason = t.auth?.accountSuspended || 'Your account has been suspended.';
      await logAudit(false, reason);
      return errorResponse(reason, 403);
    }
    if (requester.account_status === 'banned') {
      await logAudit(false, 'Your account has been banned.');
      return errorResponse('Your account has been banned.', 403);
    }

    // Check tier-based request limits
    const requestStatus = canMakeRequest(requester);
    const memberTier = getMemberTier(requester);

    // For basic tier with limit reached, we'll do soft block (show blurred matches)
    // Store this flag to handle soft block after matching
    const shouldSoftBlock = !requestStatus.allowed && requestStatus.reason === 'limit_reached' && memberTier === 'basic';

    // For other blocking reasons, return hard error
    if (!requestStatus.allowed && !shouldSoftBlock) {
      if (requestStatus.reason === 'not_approved') {
        await logAudit(false, 'Account not approved');
        return errorResponse('Your account is pending approval.', 403);
      }
      if (requestStatus.reason === 'account_suspended') {
        await logAudit(false, 'Account suspended');
        return errorResponse(t.auth?.accountSuspended || 'Your account has been suspended.', 403);
      }
      if (requestStatus.reason === 'limit_reached' && memberTier === 'premium') {
        await logAudit(false, 'Premium monthly limit reached');
        return errorResponse(`Monthly request limit reached. Premium members can make up to ${TIER_LIMITS.premium.monthly_limit} requests per month.`, 403);
      }
    }

    let matchResults: { id: string; reason: string; match_score?: number }[] = [];
    let finalMatches: { id: string; reason: string; match_score?: number }[] = [];
    let enrichedMatches: unknown[] = [];

    // Cap results based on tier
    const maxResults = memberTier === 'premium'
      ? TIER_LIMITS.premium.max_results_per_request
      : TIER_LIMITS.basic.max_results_per_request;

    // 3. Fetch candidates based on type
    if (type === 'dating') {
      const { findDatingMatches } = await import('@/lib/gemini');

      // Validate requester has valid gender and status for dating
      if (!['Male', 'Female'].includes(requester.gender || '')) {
        return errorResponse('Please complete your dating profile with a valid gender (Male/Female) first.', 400);
      }
      // Accept both "Single" and "Single (Available)" per validation session
      if (requester.relationship_status !== 'Single' && requester.relationship_status !== 'Single (Available)') {
        return errorResponse('Must be Single or Single (Available) to use dating feature.', 400);
      }

      // Get all members for dating - filter by opposite gender and single status
      const allMembers = await getMembers();
      const oppositeGender = requester.gender === 'Male' ? 'Female' : 'Male';

      let availableMembers = allMembers.filter(m =>
        m.id !== requester.id &&
        m.gender === oppositeGender &&
        (m.relationship_status === 'Single' || m.relationship_status === 'Single (Available)') &&
        m.status === 'active'
      );

      // Fallback: broaden to any active opposite-gender member if strict filter yields none
      if (availableMembers.length === 0) {
        availableMembers = allMembers.filter(m =>
          m.id !== requester.id &&
          m.gender === oppositeGender &&
          m.status === 'active'
        );
      }

      // Last resort: any active member except self
      if (availableMembers.length === 0) {
        availableMembers = allMembers.filter(m =>
          m.id !== requester.id && m.status === 'active'
        ).slice(0, 5);
      }

      // Build dating profiles from Member data for AI matching
      const datingProfiles = availableMembers.map(m => ({
        id: m.id,
        nickname: m.nickname || m.name,
        contact_email: m.email,
        location: m.country || '',
        match_preferences: '',
        birth_year: '',
        gender: m.gender || '',
        career_field: `${m.role} at ${m.company}`,
        self_description: m.self_description || '',
        truth_lie: m.truth_lie || '',
        ideal_day: m.ideal_day || '',
        qualities_looking_for: m.qualities_looking_for || '',
        core_values: m.core_values || '',
        deal_breakers: m.deal_breakers || '',
        interests: m.interests || '',
        message: m.dating_message || '',
        other_share: m.other_share || '',
        created_at: m.created_at,
      }));

      if (datingProfiles.length > 0) {
        matchResults = await findDatingMatches(request_text, datingProfiles, locale);
      }

      if (matchResults.length === 0 && availableMembers.length > 0) {
        // Fallback: return up to 3 members with low score
        finalMatches = availableMembers.slice(0, 3).map(m => ({
          id: m.id,
          reason: 'New community member open to connection.',
          match_score: 30,
        }));
      } else {
        finalMatches = matchResults;
      }

      enrichedMatches = finalMatches.map(match => {
        const member = availableMembers.find(m => m.id === match.id);
        if (!member) return null;
        return {
          ...match,
          member: {
            id: member.id,
            name: member.nickname || member.name,
            role: '', // Hidden for privacy in love matching
            company: member.country || '', // Only show location, not company
            expertise: member.interests || '',
            can_help_with: member.ideal_day || '',
            looking_for: member.qualities_looking_for || '',
            bio: member.self_description
              ? `${member.self_description}${member.core_values ? `. Values: ${member.core_values}` : ''}`
              : '',
            avatar_url: member.avatar_url || '',
            gender: member.gender || '',
            self_description: member.self_description || '',
            interests: member.interests || '',
            core_values: member.core_values || '',
            ideal_day: member.ideal_day || '',
            qualities_looking_for: member.qualities_looking_for || '',
            status: 'active',
          }
        };
      }).filter(Boolean);

    } else {
      // Professional, Job, or Hiring Logic
      // Use all active members as candidates so AI search covers the full community
      const allMembers = await getMembers();
      let availableMembers = allMembers.filter(m => m.id !== requester.id && m.status === 'active');

      // Filter based on request type
      if (type === 'job') {
        const hiringMembers = availableMembers.filter(m => m.hiring);
        // Fallback to all active members if no one is explicitly hiring
        if (hiringMembers.length > 0) availableMembers = hiringMembers;
      } else if (type === 'hiring') {
        const openToWorkMembers = availableMembers.filter(m => m.open_to_work);
        // Fallback to all active members if no one is explicitly open to work
        if (openToWorkMembers.length > 0) availableMembers = openToWorkMembers;
      }

      matchResults = availableMembers.length > 0
        ? await findMatches(
            request_text,
            availableMembers.map(m => ({
              id: m.id,
              name: m.name,
              role: m.role,
              company: m.company,
              expertise: m.expertise,
              can_help_with: m.can_help_with,
              looking_for: m.looking_for,
              bio: m.bio,
              job_preferences: m.job_preferences,
              hiring_preferences: m.hiring_preferences,
            })),
            locale
          )
        : [];

      finalMatches = matchResults;
      if (matchResults.length === 0 && availableMembers.length > 0) {
        finalMatches = availableMembers
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
          .map(m => ({ id: m.id, reason: 'Recommended community member.', match_score: 30 }));
      }

      enrichedMatches = finalMatches
        .map(match => {
          const member = availableMembers.find(m => m.id === match.id);
          if (!member) return null;
          return {
            ...match,
            member,
          };
        })
        .filter(Boolean);
    }

    // Cap results based on tier
    finalMatches = finalMatches.slice(0, maxResults);
    enrichedMatches = enrichedMatches.slice(0, maxResults);

    const connectionRequest: ConnectionRequest = {
      id: generateId(),
      requester_id: requester.id,
      request_text,
      matched_ids: finalMatches.map(m => m.id).join(','),
      status: 'matched',
      created_at: formatDate(),
      category,
    };

    await addRequest(connectionRequest);

    // Audit success
    await logAudit(true, undefined, connectionRequest.id);

    // Update request counts
    await incrementMemberRequestCounts(requester.id);

    if (requester.paid) {
      await incrementMemberMonthlyRequests(requester.id);
    } else {
      await updateMemberFreeRequests(requester.id, requester.free_requests_used + 1);
    }

    // Soft block for basic tier with limit reached - show blurred matches
    if (shouldSoftBlock) {
      const blurredMatches = enrichedMatches
        .map(match => createBlurredMatch(match as { id: string; reason: string; member?: import('@/types').Member }))
        .filter(Boolean);

      return successResponse({
        request_id: connectionRequest.id,
        matches: blurredMatches,
        upgrade_required: true,
        message: 'Upgrade to premium to see full profiles and make unlimited connections.',
      });
    }

    return successResponse({
      request_id: connectionRequest.id,
      matches: enrichedMatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
