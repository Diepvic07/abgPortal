import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import {
  getRequestsByMemberId,
  getConnectionsByTargetId,
  getMemberById,
  getRequestById,
} from '@/lib/google-sheets';

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
            const member = await getMemberById(req.selected_id);
            if (member) {
              matchedMember = {
                id: member.id,
                name: member.name,
                role: member.role,
                company: member.company,
                avatar_url: member.avatar_url,
              };
            }
          }
          return {
            id: req.id,
            request_text: req.request_text,
            status: req.status,
            created_at: req.created_at,
            matched_member: matchedMember,
          };
        })
      );

      return successResponse({ requests: enrichedRequests });
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

      return successResponse({ connections: enrichedConnections });
    }

    return errorResponse('Invalid type parameter', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
