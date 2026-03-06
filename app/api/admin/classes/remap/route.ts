import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { remapMemberClass, getAbgClasses } from '@/lib/supabase-db';

// POST: Remap members from one class name to another
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { old_class, new_class } = await request.json();
    if (!old_class || !new_class) {
      return NextResponse.json({ error: 'old_class and new_class are required' }, { status: 400 });
    }

    // Validate new_class is a canonical class
    const canonical = await getAbgClasses(false);
    if (!canonical.some(c => c.name === new_class)) {
      return NextResponse.json({ error: 'new_class is not a canonical class' }, { status: 400 });
    }

    const count = await remapMemberClass(old_class, new_class);
    return NextResponse.json({ success: true, remapped_count: count });
  } catch (error) {
    console.error('[AdminClasses] Remap error:', error);
    return NextResponse.json({ error: 'Failed to remap class' }, { status: 500 });
  }
}
