import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth, getAuthenticatedMember } from '@/lib/auth-middleware';
import { getProposalById, updateProposal, getCommitmentsByProposal, getCommentsByProposal, getMemberCommitment } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Auth optional for viewing — logged-in users see their commitment status
    const member = await getAuthenticatedMember(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    const commitments = await getCommitmentsByProposal(id);
    const comments = await getCommentsByProposal(id, member?.id);
    const myCommitment = member ? await getMemberCommitment(id, member.id) : null;

    // Fetch discussion data if proposal has discussion enabled
    let discussion = null;
    let discussionResponses: unknown[] = [];
    if (proposal.has_discussion) {
      const supabase = createServerSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: disc } = await (supabase.from('proposal_discussions') as any)
        .select('*')
        .eq('proposal_id', id)
        .single();

      if (disc) {
        discussion = disc;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: respRows } = await (supabase.from('proposal_discussion_responses') as any)
          .select('*, members:member_id(name, email, avatar_url)')
          .eq('discussion_id', disc.id)
          .order('created_at', { ascending: true });
        discussionResponses = respRows || [];
      }
    }

    return successResponse({
      proposal: { ...proposal, my_commitment: myCommitment?.commitment_level || null },
      commitments,
      comments,
      discussion,
      discussionResponses,
      currentMemberId: member?.id || null,
      currentMemberAvatarUrl: member?.avatar_url || null,
      currentMemberIsAdmin: member?.is_admin === true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) {
      return errorResponse('Proposal not found', 404);
    }

    // Only author or admin can edit; authors can only edit when no other commitments
    const isAdmin = member.is_admin === true;
    if (proposal.created_by_member_id !== member.id && !isAdmin) {
      return errorResponse('Not authorized', 403);
    }
    if (!isAdmin && proposal.commitment_count > 1) {
      return errorResponse('Cannot edit proposal after others have committed', 400);
    }

    const body = await request.json();
    const { title, description, category, genre, target_date, location, participation_format, tags } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) {
      if (title.length < 5 || title.length > 200) return errorResponse('Title must be between 5 and 200 characters', 400);
      updates.title = title;
    }
    if (description !== undefined) {
      if (description.length < 20 || description.length > 5000) return errorResponse('Description must be between 20 and 5000 characters', 400);
      updates.description = description;
    }
    if (category !== undefined) updates.category = category;
    if (genre !== undefined) updates.genre = genre;
    if (target_date !== undefined) updates.target_date = target_date || null;
    if (location !== undefined) updates.location = location || null;
    if (participation_format !== undefined) updates.participation_format = participation_format;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()).slice(0, 10) : [];

    // Update proposal fields first (without has_discussion to avoid schema cache issues)
    const updated = await updateProposal(id, updates);

    // If enabling discussion, create the discussion record and flag separately
    if (body.has_discussion === true && !proposal.has_discussion) {
      const { discussion_date_options } = body;
      if (Array.isArray(discussion_date_options) && discussion_date_options.length >= 2) {
        const { generateId, formatDate } = await import('@/lib/utils');
        const supabase = createServerSupabaseClient();
        const now = formatDate();

        // Check if discussion already exists (from a previous partial attempt)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing, error: checkErr } = await (supabase.from('proposal_discussions') as any)
          .select('id')
          .eq('proposal_id', id)
          .maybeSingle();
        if (checkErr) {
          console.error('Error checking existing discussion:', checkErr);
          return errorResponse(`Failed to create discussion: ${checkErr.message || checkErr.code}`, 500);
        }

        if (!existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertErr } = await (supabase.from('proposal_discussions') as any)
            .insert({
              id: generateId(),
              proposal_id: id,
              status: 'open',
              date_options: discussion_date_options.slice(0, 10),
              created_at: now,
              updated_at: now,
            });
          if (insertErr) {
            console.error('Error creating discussion record:', insertErr);
            return errorResponse(`Failed to create discussion: ${insertErr.message || insertErr.code || JSON.stringify(insertErr)}`, 500);
          }
        }

        // Update has_discussion flag separately (matches POST route pattern)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('community_proposals') as any)
          .update({ has_discussion: true, updated_at: now })
          .eq('id', id);
      }
    }

    // Re-fetch to get the latest state including has_discussion
    const latest = await getProposalById(id);
    return successResponse({ proposal: latest || updated });
  } catch (error) {
    return handleApiError(error);
  }
}
