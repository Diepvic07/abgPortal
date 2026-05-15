import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemberById, updateMember, updateMemberEmail, deleteMember } from '@/lib/supabase-db';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isAdminAsync } from '@/lib/admin-utils-server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keepId, deleteId, mergedFields } = await request.json();
    if (!keepId || !deleteId || !mergedFields) {
      return NextResponse.json({ error: 'keepId, deleteId, and mergedFields are required' }, { status: 400 });
    }

    const keepMember = await getMemberById(keepId);
    const deleteMemberData = await getMemberById(deleteId);
    if (!keepMember || !deleteMemberData) {
      return NextResponse.json({ error: 'One or both members not found' }, { status: 404 });
    }

    // Build the update object from merged fields
    const updates: Record<string, unknown> = {};
    const allowedMergeFields = [
      'name', 'role', 'company', 'expertise', 'can_help_with', 'looking_for',
      'bio', 'abg_class', 'phone', 'country', 'gender', 'relationship_status',
      'birth_year', 'nickname', 'facebook_url', 'linkedin_url', 'company_website',
    ];

    for (const field of allowedMergeFields) {
      if (field in mergedFields) {
        updates[field] = mergedFields[field] || null;
      }
    }

    // Transfer premium status if the deleted member has it
    if (deleteMemberData.paid && !keepMember.paid) {
      updates.paid = true;
      updates.payment_status = deleteMemberData.payment_status || 'paid';
      updates.membership_expiry = deleteMemberData.membership_expiry || null;
    }

    // Add the deleted member's email as a secondary email
    const existingSecondary = keepMember.secondary_emails || [];
    const deletedEmail = deleteMemberData.email.toLowerCase();
    const deletedSecondary = deleteMemberData.secondary_emails || [];
    const allSecondaryEmails = [...new Set([
      ...existingSecondary,
      deletedEmail,
      ...deletedSecondary,
    ])].filter((e) => e.toLowerCase() !== keepMember.email.toLowerCase());
    updates.secondary_emails = allSecondaryEmails;

    // Handle email change if merged fields specify a different primary email
    if (mergedFields.email && mergedFields.email.toLowerCase() !== keepMember.email.toLowerCase()) {
      // The keep member's current email should also become a secondary email
      const currentEmail = keepMember.email.toLowerCase();
      if (!allSecondaryEmails.includes(currentEmail)) {
        allSecondaryEmails.push(currentEmail);
        updates.secondary_emails = allSecondaryEmails.filter(
          (e) => e.toLowerCase() !== mergedFields.email.toLowerCase()
        );
      }
      await updateMemberEmail(keepId, mergedFields.email.toLowerCase());
    }

    // Clear duplicate flags
    updates.potential_duplicate_of = null;
    updates.duplicate_note = null;

    // Apply updates to the keep member
    await updateMember(keepId, updates as Parameters<typeof updateMember>[1]);

    // Transfer related records from deleted member to kept member before deleting
    const db = createServerSupabaseClient();

    // Transfer event RSVPs (skip if kept member already has RSVP for same event)
    const { data: deleteRsvps } = await db.from('community_event_rsvps').select('id, event_id').eq('member_id', deleteId);
    if (deleteRsvps?.length) {
      const { data: keepRsvps } = await db.from('community_event_rsvps').select('event_id').eq('member_id', keepId);
      const keepEventIds = new Set(keepRsvps?.map((r) => r.event_id) || []);
      const transferIds = deleteRsvps.filter((r) => !keepEventIds.has(r.event_id)).map((r) => r.id);
      if (transferIds.length) {
        await db.from('community_event_rsvps').update({ member_id: keepId }).in('id', transferIds);
      }
      // Delete remaining duplicates
      await db.from('community_event_rsvps').delete().eq('member_id', deleteId);
    }

    // Transfer event comments
    await db.from('community_event_comments').update({ member_id: keepId }).eq('member_id', deleteId);

    // Transfer proposal commitments (skip duplicates)
    const { data: deleteCommitments } = await db.from('community_commitments').select('id, proposal_id').eq('member_id', deleteId);
    if (deleteCommitments?.length) {
      const { data: keepCommitments } = await db.from('community_commitments').select('proposal_id').eq('member_id', keepId);
      const keepProposalIds = new Set(keepCommitments?.map((c) => c.proposal_id) || []);
      const transferCommitIds = deleteCommitments.filter((c) => !keepProposalIds.has(c.proposal_id)).map((c) => c.id);
      if (transferCommitIds.length) {
        await db.from('community_commitments').update({ member_id: keepId }).in('id', transferCommitIds);
      }
      await db.from('community_commitments').delete().eq('member_id', deleteId);
    }

    // Transfer reactions
    await db.from('community_reactions').delete().eq('member_id', deleteId);
    await db.from('comment_reactions').delete().eq('member_id', deleteId);

    // Transfer proposal discussions & poll votes
    await db.from('proposal_discussion_replies').update({ member_id: keepId }).eq('member_id', deleteId);
    await db.from('proposal_poll_votes').delete().eq('member_id', deleteId);

    // Transfer news comments
    await db.from('news_comments').update({ member_id: keepId }).eq('member_id', deleteId);

    // Nullify organizer references
    await db.from('community_events').update({ organizer_member_id: null }).eq('organizer_member_id', deleteId);

    // Transfer proposals created by deleted member
    await db.from('community_proposals').update({ created_by_member_id: keepId }).eq('created_by_member_id', deleteId);
    await db.from('community_proposals').update({ selected_by_member_id: keepId }).eq('selected_by_member_id', deleteId);

    // Transfer events created by deleted member
    await db.from('community_events').update({ created_by_member_id: keepId }).eq('created_by_member_id', deleteId);

    // Transfer guest RSVPs
    await db.from('event_guest_rsvps').update({ member_id: keepId }).eq('member_id', deleteId);

    // Transfer score records
    await db.from('member_scores').delete().eq('member_id', deleteId);
    await db.from('member_score_history').delete().eq('member_id', deleteId);

    // Delete the other member
    await deleteMember(deleteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin merge-members error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
