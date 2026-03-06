import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { updateAbgClass, deleteAbgClass } from '@/lib/supabase-db';

// PUT: Update a canonical class (name, display_order, is_active)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const updated = await updateAbgClass(id, updates);
    return NextResponse.json({ class: updated });
  } catch (error) {
    console.error('[AdminClasses] PUT error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update class';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Remove a canonical class
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteAbgClass(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminClasses] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
  }
}
