import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { createProposal, getProposals, upsertCommitment } from '@/lib/supabase-community';
import { ProposalCategory, CommitmentLevel } from '@/types';

const VALID_CATEGORIES: ProposalCategory[] = ['charity', 'event', 'learning', 'community_support', 'other'];
const VALID_COMMITMENTS: CommitmentLevel[] = ['interested', 'will_participate', 'will_lead'];

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
    const { title, description, category, target_date, commitment_level } = body;

    if (!title || title.length < 5 || title.length > 200) {
      return errorResponse('Title must be between 5 and 200 characters', 400);
    }
    if (!description || description.length < 20 || description.length > 5000) {
      return errorResponse('Description must be between 20 and 5000 characters', 400);
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errorResponse('Invalid category', 400);
    }

    const proposerCommitment: CommitmentLevel = commitment_level && VALID_COMMITMENTS.includes(commitment_level) ? commitment_level : 'will_lead';

    // Create the proposal
    const proposal = await createProposal({
      created_by_member_id: member.id,
      title,
      description,
      category,
      target_date: target_date || undefined,
    });

    // Commit proposer at their chosen level
    await upsertCommitment({
      proposal_id: proposal.id,
      member_id: member.id,
      commitment_level: proposerCommitment,
    });

    return successResponse({ proposal }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
