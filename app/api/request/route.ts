import { NextRequest } from 'next/server';
import { findMatches } from '@/lib/gemini';
import { getActivePaidMembers, getMemberByEmail, addRequest, updateMemberFreeRequests, incrementMemberRequestCounts, addRequestAudit } from '@/lib/google-sheets';
import { notifyAdmin } from '@/lib/discord';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { getTranslations, type Locale } from '@/lib/i18n';
import { ConnectionRequest } from '@/types';
import { requireAuth } from '@/lib/auth-middleware';
import { checkForAbuse } from '@/lib/abuse-detection';

const FREE_REQUEST_LIMIT = 0; // Basic users must upgrade to premium
const PREMIUM_DAILY_LIMIT = 50;

export async function POST(request: NextRequest) {
  try {
    // Require authentication - get authenticated member
    const requester = await requireAuth(request);

    const { request_text, type = 'professional', locale = 'en' } = await request.json();
    const t = getTranslations(locale as Locale);

    if (!request_text) {
      return errorResponse('Missing required fields', 400);
    }

    // Check for abuse
    const abuse = await checkForAbuse(requester.id, request_text);
    if (abuse.shouldSuspend) {
      await notifyAdmin('abuse_detected', {
        requester_name: requester.name,
        request_text: `Account flagged for: ${abuse.reason}`,
      });
      // Optionally could return error here if we want to block them immediately
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

    // Check limits
    if (!requester.paid && requester.role !== 'Admin') {
      // Free user: max 3 requests total
      if (requester.free_requests_used >= FREE_REQUEST_LIMIT) {
        await logAudit(false, 'Free request limit reached');
        return errorResponse(t.request.errors.limitReached, 403);
      }
    } else if (requester.paid) {
      // Premium user: max 50 requests per day
      if ((requester.requests_today || 0) >= PREMIUM_DAILY_LIMIT) {
        await logAudit(false, 'Premium daily limit reached');
        return errorResponse(`Daily request limit reached. Premium members can make up to ${PREMIUM_DAILY_LIMIT} requests per day.`, 403);
      }
    }

    let matchResults = [];
    let finalMatches = [];
    let enrichedMatches = [];
    let availableMembersOrProfiles = []; // To hold either members or dating profiles

    // 3. Fetch candidates based on type
    if (type === 'dating') {
      const { getDatingProfiles, getDatingProfileByEmail } = await import('@/lib/google-sheets');
      const { findDatingMatches } = await import('@/lib/gemini');
      const { filterByGenderPreference } = await import('@/lib/dating-utils');

      // Get requester's dating profile to check gender preferences
      const requesterDatingProfile = await getDatingProfileByEmail(requester.email);
      if (!requesterDatingProfile) {
        return errorResponse('Please create a dating profile first at /dating to use this feature.', 404);
      }

      const allProfiles = await getDatingProfiles();
      let availableProfiles = allProfiles.filter(p => p.contact_email !== requester.email); // Exclude self

      if (availableProfiles.length === 0) {
        return errorResponse('No dating profiles available yet.', 404);
      }

      // Filter by gender preference before AI matching
      availableProfiles = filterByGenderPreference(
        requesterDatingProfile.match_preferences,
        availableProfiles
      );

      if (availableProfiles.length === 0) {
        return Response.json({
          matches: [],
          request_id: 'no-matches',
          message: 'No profiles match your gender preferences currently.'
        });
      }

      matchResults = await findDatingMatches(request_text, availableProfiles, locale);

      if (matchResults.length === 0) {
        // Fallback
        finalMatches = availableProfiles.slice(0, 3).map(p => ({
          id: p.id,
          reason: 'New community member open to connection.'
        }));
      } else {
        finalMatches = matchResults;
      }

      enrichedMatches = finalMatches.map(match => {
        const profile = availableProfiles.find(p => p.id === match.id);
        if (!profile) return null;
        return {
          ...match,
          member: {
            // Map dating profile to member-like structure for frontend compatibility
            id: profile.id,
            name: profile.nickname, // Use Nickname
            role: profile.gender,
            company: profile.location,
            expertise: profile.interests,
            can_help_with: profile.ideal_day, // Showing Ideal Day as "Help" area for now
            looking_for: profile.qualities_looking_for,
            bio: `${profile.self_description}. Values: ${profile.core_values}`,
            avatar_url: '', // Default avatar
            status: 'active',
          }
        };
      }).filter(Boolean);

    } else {
      // Professional, Job, or Hiring Logic
      const allMembers = await getActivePaidMembers();
      let availableMembers = allMembers.filter(m => m.id !== requester.id);

      // Filter based on request type
      if (type === 'job') {
        // User looking for job -> Find members who are HIRING
        availableMembers = availableMembers.filter(m => m.hiring);
      } else if (type === 'hiring') {
        // User looking for candidates -> Find members who are OPEN TO WORK
        availableMembers = availableMembers.filter(m => m.open_to_work);
      }

      if (availableMembers.length === 0) {
        let msg = 'No members available for matching';
        if (type === 'job') msg = 'No members currently hiring found.';
        if (type === 'hiring') msg = 'No members currently looking for work found.';

        return Response.json({
          matches: [],
          request_id: 'no-candidates',
          message: msg
        });
      }

      matchResults = await findMatches(
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
          // Include new fields in context if relevant
          job_preferences: m.job_preferences,
          hiring_preferences: m.hiring_preferences,
        })),
        locale
      );

      finalMatches = matchResults;
      if (matchResults.length === 0) {
        const fallbackMembers = availableMembers
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
          .map(m => ({ id: m.id, reason: 'Recommended community member.' }));

        finalMatches = fallbackMembers;
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

    const connectionRequest: ConnectionRequest = {
      id: generateId(),
      requester_id: requester.id,
      request_text,
      matched_ids: finalMatches.map(m => m.id).join(','),
      status: 'matched',
      created_at: formatDate(),
    };

    await addRequest(connectionRequest);

    // Audit success
    await logAudit(true, undefined, connectionRequest.id);

    // Update request counts
    await incrementMemberRequestCounts(requester.id);

    if (!requester.paid) {
      await updateMemberFreeRequests(requester.id, requester.free_requests_used + 1);
    }

    await notifyAdmin('new_request', {
      requester_name: requester.name,
      request_text: `[${type.toUpperCase()}] ${request_text}`,
    });

    return successResponse({
      request_id: connectionRequest.id,
      matches: enrichedMatches,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
