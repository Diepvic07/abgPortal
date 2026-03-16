import { NextRequest, NextResponse } from 'next/server';
import { getUnresolvedDuplicates } from '@/lib/supabase-db';
import { sendDuplicateReminderEmail } from '@/lib/resend';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get duplicates older than 48 hours
    const unresolved = await getUnresolvedDuplicates(48);

    if (unresolved.length === 0) {
      return NextResponse.json({ message: 'No unresolved duplicates', count: 0 });
    }

    await sendDuplicateReminderEmail(
      unresolved.map(m => ({
        name: m.name,
        email: m.email,
        createdAt: m.created_at,
        duplicateNote: m.duplicate_note || 'Potential duplicate',
      }))
    );

    return NextResponse.json({
      message: `Reminder sent for ${unresolved.length} unresolved duplicate(s)`,
      count: unresolved.length,
    });
  } catch (error) {
    console.error('Duplicate reminder cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
