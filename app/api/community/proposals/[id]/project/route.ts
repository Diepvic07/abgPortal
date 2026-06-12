import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth-middleware';
import { getProposalById } from '@/lib/supabase-community';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateId, formatDate } from '@/lib/utils';
import { PROJECT_STATUSES, ProposalStatus } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

type ProjectMemberRow = {
  member_id: string;
  joined_at: string;
  members?: { name?: string | null; avatar_url?: string | null; public_profile_slug?: string | null } | null;
};

type StatusLogRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_at: string;
  changed_by_member_id: string | null;
  members?: { name?: string | null } | null;
};

const NOTE_MAX = 1000;
const CHAT_URL_MAX = 500;

function isValidProjectStatus(s: unknown): s is ProposalStatus {
  return typeof s === 'string' && (PROJECT_STATUSES as readonly string[]).includes(s);
}

// GET: members + status log + i_joined
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: memberRows } = await (supabase.from('proposal_project_members') as any)
      .select('member_id, joined_at, members:member_id(name, avatar_url, public_profile_slug)')
      .eq('proposal_id', id)
      .order('joined_at', { ascending: true });

    const { data: logRows } = await (supabase.from('proposal_project_status_log') as any)
      .select('id, from_status, to_status, note, changed_at, changed_by_member_id, members:changed_by_member_id(name)')
      .eq('proposal_id', id)
      .order('changed_at', { ascending: false });

    // Resolve current viewer's membership (best-effort — not authenticated views just see i_joined=false).
    let iJoined = false;
    try {
      const viewer = await requireAuth(request);
      iJoined = !!(memberRows as ProjectMemberRow[] | null)?.some((m) => m.member_id === viewer.id);
    } catch {
      iJoined = false;
    }

    const members = (memberRows as ProjectMemberRow[] | null || []).map((m) => ({
      member_id: m.member_id,
      joined_at: m.joined_at,
      name: m.members?.name || null,
      avatar_url: m.members?.avatar_url || null,
      public_profile_slug: m.members?.public_profile_slug || null,
    }));

    const status_log = (logRows as StatusLogRow[] | null || []).map((l) => ({
      id: l.id,
      from_status: l.from_status,
      to_status: l.to_status,
      note: l.note,
      changed_at: l.changed_at,
      changed_by_member_id: l.changed_by_member_id,
      changed_by_name: l.members?.name || null,
    }));

    return successResponse({ members, status_log, i_joined: iJoined });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: form a project from the proposal (creator or admin).
//       Requires at least one of chat_url / public note.
//       Auto-joins the creator.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    const isCreator = proposal.created_by_member_id === member.id;
    const isAdmin = !!member.is_admin;
    if (!isCreator && !isAdmin) {
      return errorResponse('Only the proposal creator or admin can form a project', 403);
    }

    if ((PROJECT_STATUSES as readonly string[]).includes(proposal.status)) {
      return errorResponse('This proposal is already a project', 400);
    }

    const body = await request.json();
    const chatUrl = typeof body.chat_url === 'string' ? body.chat_url.trim().slice(0, CHAT_URL_MAX) : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : '';

    if (!chatUrl && !note) {
      return errorResponse('Either a chat URL or a public note is required to form a project', 400);
    }

    const supabase = createServerSupabaseClient();
    const now = formatDate();

    // Flip proposal into project_active.
    const { error: updateErr } = await (supabase.from('community_proposals') as any)
      .update({
        status: 'project_active' as ProposalStatus,
        project_chat_url: chatUrl || null,
        project_status_note: note || null,
        project_started_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (updateErr) throw new Error('Failed to form project');

    // Log the transition.
    await (supabase.from('proposal_project_status_log') as any).insert({
      id: generateId(),
      proposal_id: id,
      from_status: proposal.status,
      to_status: 'project_active',
      note: note || null,
      changed_by_member_id: member.id,
      changed_at: now,
    });

    // Auto-join the proposal creator (whichever of creator/admin pressed the
    // button — we always join the proposal's *creator*, not whoever triggered).
    await (supabase.from('proposal_project_members') as any)
      .upsert({
        proposal_id: id,
        member_id: proposal.created_by_member_id,
        joined_at: now,
      }, { onConflict: 'proposal_id,member_id', ignoreDuplicates: true });

    const updated = await getProposalById(id);
    return successResponse({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH: change project status (project_active → project_completed /
//        project_discontinued / project_closed). Requires a public note.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireAuth(request);
    const { id } = await params;

    const proposal = await getProposalById(id);
    if (!proposal) return errorResponse('Proposal not found', 404);

    const isCreator = proposal.created_by_member_id === member.id;
    const isAdmin = !!member.is_admin;
    if (!isCreator && !isAdmin) {
      return errorResponse('Only the proposal creator or admin can change project status', 403);
    }

    if (!(PROJECT_STATUSES as readonly string[]).includes(proposal.status)) {
      return errorResponse('Proposal is not currently a project', 400);
    }

    const body = await request.json();
    const newStatus = body.status;
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, NOTE_MAX) : '';

    if (!isValidProjectStatus(newStatus)) {
      return errorResponse('Invalid project status', 400);
    }
    if (newStatus === proposal.status) {
      return errorResponse('Project is already in this status', 400);
    }
    if (!note) {
      return errorResponse('A public note is required when changing project status', 400);
    }

    const supabase = createServerSupabaseClient();
    const now = formatDate();

    const updates: Record<string, unknown> = {
      status: newStatus,
      project_status_note: note,
      updated_at: now,
    };
    if (newStatus === 'project_completed') updates.completed_at = now;

    const { error: updateErr } = await (supabase.from('community_proposals') as any)
      .update(updates)
      .eq('id', id);

    if (updateErr) throw new Error('Failed to change project status');

    await (supabase.from('proposal_project_status_log') as any).insert({
      id: generateId(),
      proposal_id: id,
      from_status: proposal.status,
      to_status: newStatus,
      note,
      changed_by_member_id: member.id,
      changed_at: now,
    });

    const updated = await getProposalById(id);
    return successResponse({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
