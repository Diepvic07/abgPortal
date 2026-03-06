import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import {
  getAbgClasses,
  createAbgClass,
  getUnmappedClasses,
} from '@/lib/supabase-db';

// GET: List all canonical classes + unmapped classes from members
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [classes, unmapped] = await Promise.all([
      getAbgClasses(false), // include inactive
      getUnmappedClasses(),
    ]);

    return NextResponse.json({ classes, unmapped });
  } catch (error) {
    console.error('[AdminClasses] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}

// POST: Create a new canonical class
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, display_order } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
    }

    const created = await createAbgClass(name.trim(), display_order ?? 0);
    return NextResponse.json({ class: created });
  } catch (error) {
    console.error('[AdminClasses] POST error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create class';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
