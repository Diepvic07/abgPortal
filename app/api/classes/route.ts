import { NextResponse } from 'next/server';
import { getAbgClasses } from '@/lib/supabase-db';

// GET: Return active canonical classes (for form dropdowns)
export async function GET() {
  try {
    const classes = await getAbgClasses(true);
    return NextResponse.json({
      classes: classes.map(c => c.name),
    });
  } catch (error) {
    console.error('[Classes] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}
