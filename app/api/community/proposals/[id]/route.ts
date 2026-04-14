import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth, getAuthenticatedMember } from '@/lib/auth-middleware';
import { getProposalById, updateProposal, getCommitmentsByProposal, getCommentsByProposal, getMemberCommitment } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';

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

    // Fetch poll data if proposal has a freestyle poll
    let poll = null;
    let pollResponses: unknown[] = [];
    if (proposal.has_poll) {
      const supabase2 = createServerSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: pollData } = await (supabase2.from('proposal_polls') as any)
        .select('*')
        .eq('proposal_id', id)
        .single();
      if (pollData) {
        poll = pollData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pollRespRows } = await (supabase2.from('proposal_poll_responses') as any)
          .select('*, members:member_id(name, avatar_url)')
          .eq('poll_id', pollData.id)
          .order('created_at', { ascending: true });
        pollResponses = pollRespRows || [];
      }
    }

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

        // Backfill creator's auto-vote if missing or incomplete
        if (disc.status === 'open') {
          const creatorId = proposal.created_by_member_id;
          const allDates = (disc.date_options as string[]) || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: creatorResp } = await (supabase.from('proposal_discussion_responses') as any)
            .select('id, available_dates')
            .eq('discussion_id', disc.id)
            .eq('member_id', creatorId)
            .single();

          const now = formatDate();
          if (!creatorResp) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('proposal_discussion_responses') as any)
              .insert({
                id: generateId(),
                discussion_id: disc.id,
                member_id: creatorId,
                available_dates: allDates,
                created_at: now,
                updated_at: now,
              });
          } else {
            const existing = (creatorResp.available_dates as string[]) || [];
            const missingDates = allDates.filter((d: string) => !existing.includes(d));
            if (missingDates.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase.from('proposal_discussion_responses') as any)
                .update({ available_dates: allDates, updated_at: now })
                .eq('id', creatorResp.id);
            }
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: respRows } = await (supabase.from('proposal_discussion_responses') as any)
          .select('*, members:member_id(name, email, avatar_url, public_profile_slug)')
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
      poll,
      pollResponses,
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

    // Recap can be saved by creator or admin regardless of commitment count
    if (body.recap_text !== undefined || body.recap_images !== undefined) {
      const recapUpdates: Record<string, unknown> = {};
      if (body.recap_text !== undefined) {
        recapUpdates.recap_text = body.recap_text ? String(body.recap_text).trim().slice(0, 5000) : null;
      }
      if (body.recap_images !== undefined) {
        recapUpdates.recap_images = Array.isArray(body.recap_images) ? body.recap_images.slice(0, 20) : [];
      }
      // Set recap_created_at on first save
      if (!proposal.recap_created_at && (body.recap_text || (body.recap_images && body.recap_images.length > 0))) {
        recapUpdates.recap_created_at = formatDate();
      }
      // Clear recap_created_at if both text and images are removed
      if (!body.recap_text && (!body.recap_images || body.recap_images.length === 0)) {
        recapUpdates.recap_created_at = null;
      }
      const updated = await updateProposal(id, recapUpdates);
      const latest = await getProposalById(id);
      return successResponse({ proposal: latest || updated });
    }

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

    // Handle discussion: create new or update existing
    if (body.has_discussion === true) {
      const { discussion_date_options } = body;
      if (Array.isArray(discussion_date_options) && discussion_date_options.length >= 2) {
        const uniqueOpts = new Set(discussion_date_options);
        if (uniqueOpts.size !== discussion_date_options.length) {
          return errorResponse('Duplicate date/time options are not allowed', 400);
        }
        const { generateId, formatDate } = await import('@/lib/utils');
        const supabase = createServerSupabaseClient();
        const now = formatDate();

        // Check if discussion already exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing, error: checkErr } = await (supabase.from('proposal_discussions') as any)
          .select('id, date_options')
          .eq('proposal_id', id)
          .maybeSingle();
        if (checkErr) {
          console.error('Error checking existing discussion:', checkErr);
          return errorResponse(`Failed to create discussion: ${checkErr.message || checkErr.code}`, 500);
        }

        if (existing) {
          // Update existing discussion options + title/description
          const newOptions = discussion_date_options.slice(0, 10);
          const discUpdates: Record<string, unknown> = { date_options: newOptions, updated_at: now };
          if (body.discussion_title !== undefined) discUpdates.title = body.discussion_title ? String(body.discussion_title).trim().slice(0, 200) : null;
          if (body.discussion_description !== undefined) discUpdates.description = body.discussion_description ? String(body.discussion_description).trim().slice(0, 1000) : null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('proposal_discussions') as any)
            .update(discUpdates)
            .eq('id', existing.id);

          // Only clear votes if the date options actually changed
          const oldOptions = (existing.date_options as string[]) || [];
          const optionsChanged = newOptions.length !== oldOptions.length || newOptions.some((o: string, i: number) => o !== oldOptions[i]);
          if (optionsChanged) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('proposal_discussion_responses') as any)
              .delete()
              .eq('discussion_id', existing.id);
          }
        } else {
          // Create new discussion record
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertErr } = await (supabase.from('proposal_discussions') as any)
            .insert({
              id: generateId(),
              proposal_id: id,
              status: 'open',
              title: body.discussion_title ? String(body.discussion_title).trim().slice(0, 200) : null,
              description: body.discussion_description ? String(body.discussion_description).trim().slice(0, 1000) : null,
              date_options: discussion_date_options.slice(0, 10),
              created_at: now,
              updated_at: now,
            });
          if (insertErr) {
            console.error('Error creating discussion record:', insertErr);
            return errorResponse(`Failed to create discussion: ${insertErr.message || insertErr.code || JSON.stringify(insertErr)}`, 500);
          }

          // Set has_discussion flag
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('community_proposals') as any)
            .update({ has_discussion: true, updated_at: now })
            .eq('id', id);
        }
      }
    }

    // Handle freestyle poll: create new or update existing
    if (body.has_poll === true) {
      const { poll_title, poll_description, poll_options, poll_allow_multiple } = body;
      if (poll_title && Array.isArray(poll_options) && poll_options.length >= 2) {
        const cleanOptions = poll_options
          .filter((o: unknown) => typeof o === 'string' && (o as string).trim())
          .map((o: string) => o.trim())
          .slice(0, 20);

        const uniquePollOpts = new Set(cleanOptions.map((o: string) => o.toLowerCase()));
        if (uniquePollOpts.size !== cleanOptions.length) {
          return errorResponse('Duplicate poll options are not allowed', 400);
        }

        const supabaseP = createServerSupabaseClient();
        const nowP = formatDate();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingPoll } = await (supabaseP.from('proposal_polls') as any)
          .select('id, options')
          .eq('proposal_id', id)
          .maybeSingle();

        if (existingPoll) {
          // Update existing poll
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseP.from('proposal_polls') as any)
            .update({
              title: String(poll_title).trim().slice(0, 200),
              description: poll_description ? String(poll_description).trim().slice(0, 1000) : null,
              options: cleanOptions,
              allow_multiple: !!poll_allow_multiple,
              updated_at: nowP,
            })
            .eq('id', existingPoll.id);

          // Only clear votes if the options actually changed
          const oldPollOptions = (existingPoll.options as string[]) || [];
          const pollOptionsChanged = cleanOptions.length !== oldPollOptions.length || cleanOptions.some((o: string, i: number) => o !== oldPollOptions[i]);
          if (pollOptionsChanged) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabaseP.from('proposal_poll_responses') as any)
              .delete()
              .eq('poll_id', existingPoll.id);
          }
        } else {
          // Create new poll
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseP.from('proposal_polls') as any)
            .insert({
              id: generateId(),
              proposal_id: id,
              title: String(poll_title).trim().slice(0, 200),
              description: poll_description ? String(poll_description).trim().slice(0, 1000) : null,
              options: cleanOptions,
              allow_multiple: !!poll_allow_multiple,
              status: 'open',
              created_at: nowP,
              updated_at: nowP,
            });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabaseP.from('community_proposals') as any)
            .update({ has_poll: true, updated_at: nowP })
            .eq('id', id);
        }
      }
    }

    // Re-fetch to get the latest state including has_discussion
    const latest = await getProposalById(id);
    return successResponse({ proposal: latest || updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Remove a proposal (creator or admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    // Only the creator or an admin can delete
    const isAuthor = proposal.created_by_member_id === member.id;
    if (!isAuthor && !member.is_admin) {
      return errorResponse('Only the proposal creator or an admin can delete this proposal', 403);
    }

    const supabase = createServerSupabaseClient();

    // Delete related data (cascading from foreign keys handles discussion responses)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('proposal_discussions') as any)
      .delete()
      .eq('proposal_id', id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('community_proposal_comments') as any)
      .delete()
      .eq('proposal_id', id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('community_commitments') as any)
      .delete()
      .eq('proposal_id', id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('community_proposals') as any)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete proposal: ${error.message}`);

    return successResponse({ message: 'Proposal deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
