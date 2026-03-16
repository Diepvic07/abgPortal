import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemberById, updateMember } from '@/lib/supabase-db';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { Member } from '@/types';

/** Editable fields that admin can update on any member profile */
const ALLOWED_FIELDS: (keyof Omit<Member, 'id' | 'email' | 'created_at'>)[] = [
  'name', 'role', 'company', 'expertise', 'can_help_with', 'looking_for',
  'bio', 'abg_class', 'phone', 'country', 'gender', 'relationship_status',
  'birth_year', 'nickname', 'facebook_url', 'linkedin_url', 'company_website',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(await isAdminAsync(session?.user?.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, updates } = await request.json();
    if (!memberId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'memberId and updates required' }, { status: 400 });
    }

    const member = await getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Filter to only allowed fields
    const safeUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key as keyof Omit<Member, 'id' | 'email' | 'created_at'>)) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateMember(memberId, safeUpdates as Partial<Omit<Member, 'id' | 'email' | 'created_at'>>);

    return NextResponse.json({ success: true, updated: Object.keys(safeUpdates) });
  } catch (error) {
    console.error('Admin update-member error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
