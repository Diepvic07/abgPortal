import { NextRequest, after } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createProposal, getProposals, upsertCommitment } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProposalCategory, ProposalGenre, CommitmentLevel, ParticipationFormat, PROPOSAL_GENRES } from '@/types';
import { sendPushToAllMembers, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';

const PROPOSAL_RATE_LIMIT_MINUTES = 1;

const VALID_CATEGORIES: ProposalCategory[] = ['talk', 'learning', 'fieldtrip', 'meeting', 'sports', 'community_support', 'charity', 'event', 'other'];
const VALID_COMMITMENTS: CommitmentLevel[] = ['interested', 'will_participate', 'will_lead'];
const VALID_FORMATS: ParticipationFormat[] = ['online', 'offline', 'hybrid'];

export async function GET(request: NextRequest) {
  try {
    // No auth required for browsing proposals — anyone can view
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ProposalCategory | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getProposals({
      category: category && VALID_CATEGORIES.includes(category) ? category : undefined,
      status: 'published',
      page,
      limit,
    });

    return successResponse({ proposals: result.proposals, total: result.total, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    const body = await request.json();
    const { title, description, category, genre, target_date, commitment_level, image_url, tags, location, participation_format, has_discussion, discussion_date_options } = body;

    if (!title || title.length < 5 || title.length > 200) {
      return errorResponse('Title must be between 5 and 200 characters', 400);
    }
    if (!description || description.length < 20 || description.length > 5000) {
      return errorResponse('Description must be between 20 and 5000 characters', 400);
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errorResponse('Invalid category', 400);
    }

    // Rate limit: 1 proposal per minute per user
    const supabase = createServerSupabaseClient();
    const cutoff = new Date(Date.now() - PROPOSAL_RATE_LIMIT_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('community_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_member_id', member.id)
      .gte('created_at', cutoff);

    if (count && count > 0) {
      return errorResponse('Bạn chỉ có thể tạo 1 đề xuất mỗi phút. Vui lòng thử lại sau.', 429);
    }

    const proposerCommitment: CommitmentLevel = commitment_level && VALID_COMMITMENTS.includes(commitment_level) ? commitment_level : 'will_lead';

    const validGenre: ProposalGenre = genre && PROPOSAL_GENRES.includes(genre) ? genre : 'other';

    // Create the proposal
    const proposal = await createProposal({
      created_by_member_id: member.id,
      title,
      description,
      category,
      genre: validGenre,
      target_date: target_date || undefined,
      image_url: image_url || undefined,
      tags: Array.isArray(tags) ? tags.filter((t: string) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()).slice(0, 10) : [],
      location: typeof location === 'string' ? location.trim().slice(0, 100) : undefined,
      participation_format: participation_format && VALID_FORMATS.includes(participation_format) ? participation_format : 'offline',
    });

    // Create discussion if enabled
    if (has_discussion && Array.isArray(discussion_date_options) && discussion_date_options.length >= 2) {
      const { generateId: genId, formatDate: fmtDate } = await import('@/lib/utils');
      const discNow = fmtDate();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('proposal_discussions') as any)
        .insert({
          id: genId(),
          proposal_id: proposal.id,
          status: 'open',
          date_options: discussion_date_options.slice(0, 10),
          created_at: discNow,
          updated_at: discNow,
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('community_proposals') as any)
        .update({ has_discussion: true, updated_at: discNow })
        .eq('id', proposal.id);
    }

    // Commit proposer at their chosen level
    await upsertCommitment({
      proposal_id: proposal.id,
      member_id: member.id,
      commitment_level: proposerCommitment,
    });

    // Send notifications to all members (exclude proposer, runs after response)
    after(async () => {
      const message = getPushMessage('new_proposal', { proposalTitle: title, proposerName: member.name }, 'vi');
      const url = `/proposals/${proposal.id}`;

      // In-app notifications (bell icon)
      try {
        await createInAppNotifications({
          type: 'new_proposal',
          title: message.title,
          body: message.body,
          url,
          excludeMemberId: member.id,
        });
      } catch (err) {
        console.error('[in-app-notif] Proposal notification failed:', err);
      }

      // Browser push notifications
      try {
        await sendPushToAllMembers('new_proposal', {
          ...message,
          url,
        }, member.id);
      } catch (pushError) {
        console.error('[push] Proposal notification failed:', pushError);
      }
    });

    return successResponse({ proposal }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
