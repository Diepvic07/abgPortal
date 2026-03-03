import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import {
  getRequestsByMemberId,
  getConnectionsByTargetId,
  getMemberById,
  getRequestById,
  getLoveMatchRequestsByUserId,
  updateLoveMatchRequest,
} from '@/lib/google-sheets';
import { formatDate } from '@/lib/utils';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'requests';
    const statusFilter = searchParams.get('status') || 'all';
    const daysFilter = parseInt(searchParams.get('days') || '0', 10);

    if (type === 'requests') {
      let requests = await getRequestsByMemberId(member.id);

      // Filter by status if not 'all'
      if (statusFilter !== 'all') {
        requests = requests.filter(r => r.status === statusFilter);
      }

      // Filter by date if days > 0
      if (daysFilter > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
        requests = requests.filter(r => new Date(r.created_at) >= cutoffDate);
      }

      // Enrich with matched member info
      const enrichedRequests = await Promise.all(
        requests.map(async (req) => {
          let matchedMember = null;
          if (req.selected_id) {
            const m = await getMemberById(req.selected_id);
            if (m) {
              matchedMember = {
                id: m.id,
                name: m.name,
                role: m.role,
                company: m.company,
                avatar_url: m.avatar_url,
              };
            }
          }
          return {
            id: req.id,
            request_text: req.request_text,
            status: req.status,
            created_at: req.created_at,
            category: req.category,
            matched_member: matchedMember,
          };
        })
      );

      // Fetch outgoing love match requests
      const allLoveMatches = await getLoveMatchRequestsByUserId(member.id);
      const outgoingLoveMatches = allLoveMatches.filter(lm => lm.from_id === member.id);

      return successResponse({ requests: enrichedRequests, love_matches: outgoingLoveMatches });
    }

    if (type === 'incoming') {
      let connections = await getConnectionsByTargetId(member.id);

      // Filter by date if days > 0
      if (daysFilter > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
        connections = connections.filter(c => new Date(c.created_at) >= cutoffDate);
      }

      // Enrich with requester info and request text
      const enrichedConnections = await Promise.all(
        connections.map(async (conn) => {
          let requester = null;
          let requestText = '';

          const requesterMember = await getMemberById(conn.from_id);
          if (requesterMember) {
            requester = {
              id: requesterMember.id,
              name: requesterMember.name,
              role: requesterMember.role,
              company: requesterMember.company,
              avatar_url: requesterMember.avatar_url,
            };
          }

          const requestData = await getRequestById(conn.request_id);
          if (requestData) {
            requestText = requestData.request_text;
          }

          return {
            id: conn.id,
            created_at: conn.created_at,
            request_text: requestText,
            requester,
          };
        })
      );

      // Fetch incoming love match requests and handle auto-timeout + mark viewed_at
      const allLoveMatches = await getLoveMatchRequestsByUserId(member.id);
      const incomingLoveMatches = allLoveMatches.filter(lm => lm.to_id === member.id);
      const now = Date.now();

      await Promise.all(
        incomingLoveMatches.map(async (lm) => {
          if (lm.status === 'pending') {
            const viewedAt = lm.viewed_at ? new Date(lm.viewed_at).getTime() : null;
            // Auto-timeout: viewed > 3 days ago => ignored
            if (viewedAt && now - viewedAt > THREE_DAYS_MS) {
              await updateLoveMatchRequest(lm.id, { status: 'ignored', resolved_at: formatDate() });
              lm.status = 'ignored';
            } else if (!lm.viewed_at) {
              // First view — mark viewed_at
              const viewedNow = formatDate();
              await updateLoveMatchRequest(lm.id, { viewed_at: viewedNow });
              lm.viewed_at = viewedNow;
            }
          }
        })
      );

      return successResponse({ connections: enrichedConnections, love_matches: incomingLoveMatches });
    }

    return errorResponse('Invalid type parameter', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
