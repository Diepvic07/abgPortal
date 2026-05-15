import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemberById, updateMember, updateMemberEmail, deleteMember } from '@/lib/supabase-db';
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

    // Delete the other member
    await deleteMember(deleteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin merge-members error:', error);
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
