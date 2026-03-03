import { NextRequest } from 'next/server';
import { getMemberByEmail, getRequestsByMemberId, getMemberById } from '@/lib/supabase-db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return errorResponse('Email is required', 400);
    }

    const member = await getMemberByEmail(email);
    if (!member) {
      return errorResponse('Member not found', 404);
    }

    const requests = await getRequestsByMemberId(member.id);

    // Enrich requests with matched member details
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        let selectedMember = null;
        let matchedMembers: { id: string; name: string; role: string; company: string; avatar_url?: string }[] = [];

        if (req.selected_id) {
          const selected = await getMemberById(req.selected_id);
          if (selected) {
            selectedMember = {
              id: selected.id,
              name: selected.name,
              role: selected.role,
              company: selected.company,
              avatar_url: selected.avatar_url,
            };
          }
        }

        if (req.matched_ids) {
          const matchIds = req.matched_ids.split(',').filter(Boolean);
          const members = await Promise.all(matchIds.map(id => getMemberById(id.trim())));
          matchedMembers = members
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .map(m => ({
              id: m.id,
              name: m.name,
              role: m.role,
              company: m.company,
              avatar_url: m.avatar_url,
            }));
        }

        return {
          ...req,
          selected_member: selectedMember,
          matched_members: matchedMembers,
        };
      })
    );

    return successResponse({
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        avatar_url: member.avatar_url,
      },
      requests: enrichedRequests,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
