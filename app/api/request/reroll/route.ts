import { NextRequest } from 'next/server';
import { findMatches, findDatingMatches } from '@/lib/gemini';
import {
  getMembers,
  getRequestById,
  getMemberById,
  updateRequestMatchedIds,
  incrementMemberRequestCounts,
  incrementMemberMonthlyRequests,
  updateMemberFreeRequests,
  addRequestAudit,
} from '@/lib/supabase-db';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { canMakeRequest, getMemberTier, TIER_LIMITS } from '@/lib/tier-utils';

export async function POST(request: NextRequest) {
  try {
    const requester = await requireAuth(request);
    const { request_id, exclude_ids = [] } = await request.json();

    if (!request_id) {
      return errorResponse('Missing request_id', 400);
    }

    // Verify request ownership
    const originalRequest = await getRequestById(request_id);
    if (!originalRequest || originalRequest.requester_id !== requester.id) {
      return errorResponse('Request not found or unauthorized', 404);
    }

    // Check tier limits (reroll counts as new request)
    const requestStatus = canMakeRequest(requester);
    if (!requestStatus.allowed) {
      return errorResponse('Request limit reached. Upgrade to continue.', 403);
    }

    const category = originalRequest.category || 'partner';
    const type: string = category === 'love' ? 'dating' : category === 'partner' ? 'professional' : category;
    const allExcludeIds = [...new Set([...exclude_ids, ...(originalRequest.matched_ids?.split(',') || [])])];

    let newMatches: { id: string; reason: string; match_score?: number }[] = [];
    const memberTier = getMemberTier(requester);
    const maxResults = memberTier === 'premium'
      ? TIER_LIMITS.premium.max_results_per_request
      : TIER_LIMITS.basic.max_results_per_request;

    if (type === 'dating') {
      const allMembers = await getMembers();
      const oppositeGender = requester.gender === 'Male' ? 'Female' : 'Male';
      const availableMembers = allMembers.filter(m =>
        m.id !== requester.id &&
        m.gender === oppositeGender &&
        (m.relationship_status === 'Single' || m.relationship_status === 'Single (Available)') &&
        m.status === 'active'
      );

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

      newMatches = await findDatingMatches(originalRequest.request_text, datingProfiles, 'en', allExcludeIds);

      // Enrich with member data (privacy-safe for love)
      const enrichedMatches = newMatches.map(match => {
        const member = availableMembers.find(m => m.id === match.id);
        if (!member) return null;
        return {
          ...match,
          member: {
            id: member.id,
            name: member.nickname || member.name,
            role: member.role,
            company: member.country || member.company,
            expertise: member.interests || member.expertise,
            can_help_with: member.ideal_day || member.can_help_with,
            looking_for: member.qualities_looking_for || member.looking_for,
            bio: member.self_description
              ? `${member.self_description}${member.core_values ? `. Values: ${member.core_values}` : ''}`
              : member.bio,
            avatar_url: member.avatar_url || '',
            gender: member.gender || '',
            self_description: member.self_description || '',
            interests: member.interests || '',
            core_values: member.core_values || '',
            ideal_day: member.ideal_day || '',
            qualities_looking_for: member.qualities_looking_for || '',
            status: 'active' as const,
          },
        };
      }).filter(Boolean);

      // Cap results by tier
      newMatches = newMatches.slice(0, maxResults);
      const cappedEnrichedMatches = enrichedMatches.slice(0, maxResults);

      // Update request's matched_ids
      const newIds = newMatches.map(m => m.id).join(',');
      const updatedIds = originalRequest.matched_ids ? `${originalRequest.matched_ids},${newIds}` : newIds;
      await updateRequestMatchedIds(request_id, updatedIds);

      // Increment counters
      await incrementMemberRequestCounts(requester.id);
      if (requester.paid) {
        await incrementMemberMonthlyRequests(requester.id);
      } else {
        await updateMemberFreeRequests(requester.id, requester.free_requests_used + 1);
      }

      await addRequestAudit({
        id: generateId(),
        member_id: requester.id,
        request_id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'unknown',
        timestamp: formatDate(),
        success: true,
        request_type: 'reroll_dating',
      });

      // Calculate updated remaining after increment
      const datingRemaining = memberTier === 'premium'
        ? TIER_LIMITS.premium.monthly_limit - ((requester.requests_this_month || 0) + 1)
        : TIER_LIMITS.basic.lifetime_requests - (requester.free_requests_used + 1);
      const datingTotalLimit = memberTier === 'premium'
        ? TIER_LIMITS.premium.monthly_limit
        : TIER_LIMITS.basic.lifetime_requests;

      return successResponse({
        matches: cappedEnrichedMatches,
        warning: requestStatus.warning,
        quota: {
          remaining: Math.max(0, datingRemaining),
          total: datingTotalLimit,
          tier: memberTier,
        },
      });
    }

    // Professional / Job / Hiring
    // Use all active members as candidates so AI search covers the full community
    const allMembersData = await getMembers();
    let availableMembers = allMembersData.filter(m => m.id !== requester.id && m.status === 'active');
    if (type === 'job') {
      const hiringMembers = availableMembers.filter(m => m.hiring);
      if (hiringMembers.length > 0) availableMembers = hiringMembers;
    } else if (type === 'hiring') {
      const openToWorkMembers = availableMembers.filter(m => m.open_to_work);
      if (openToWorkMembers.length > 0) availableMembers = openToWorkMembers;
    }

    newMatches = await findMatches(
      originalRequest.request_text,
      availableMembers.map(m => ({
        id: m.id, name: m.name, expertise: m.expertise,
        can_help_with: m.can_help_with, bio: m.bio,
        job_preferences: m.job_preferences, hiring_preferences: m.hiring_preferences,
      })),
      'en',
      type === 'partner' ? 'professional' : type,
      allExcludeIds
    );

    const enrichedMatches = newMatches.map(match => {
      const member = availableMembers.find(m => m.id === match.id);
      if (!member) return null;
      return { ...match, member };
    }).filter(Boolean);

    // Cap results by tier
    newMatches = newMatches.slice(0, maxResults);
    const cappedMatches = enrichedMatches.slice(0, maxResults);

    // Update matched_ids
    const newIds = newMatches.map(m => m.id).join(',');
    const updatedIds = originalRequest.matched_ids ? `${originalRequest.matched_ids},${newIds}` : newIds;
    await updateRequestMatchedIds(request_id, updatedIds);

    // Increment counters
    await incrementMemberRequestCounts(requester.id);
    if (requester.paid) {
      await incrementMemberMonthlyRequests(requester.id);
    } else {
      await updateMemberFreeRequests(requester.id, requester.free_requests_used + 1);
    }

    await addRequestAudit({
      id: generateId(),
      member_id: requester.id,
      request_id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
      user_agent: request.headers.get('user-agent') || 'unknown',
      timestamp: formatDate(),
      success: true,
      request_type: `reroll_${type}`,
    });

    // Calculate updated remaining after increment
    const updatedRemaining = memberTier === 'premium'
      ? TIER_LIMITS.premium.monthly_limit - ((requester.requests_this_month || 0) + 1)
      : TIER_LIMITS.basic.lifetime_requests - (requester.free_requests_used + 1);
    const totalLimit = memberTier === 'premium'
      ? TIER_LIMITS.premium.monthly_limit
      : TIER_LIMITS.basic.lifetime_requests;

    return successResponse({
      matches: cappedMatches,
      warning: requestStatus.warning,
      quota: {
        remaining: Math.max(0, updatedRemaining),
        total: totalLimit,
        tier: memberTier,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
