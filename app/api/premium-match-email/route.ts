import { NextRequest, NextResponse } from 'next/server';
import { getMemberById } from '@/lib/supabase-db';
import { generatePremiumMatches } from '@/lib/premium-match';
import { sendPremiumMatchEmail, sendProfilePromptEmail } from '@/lib/resend';

/**
 * Background job route: generates AI matches for a newly upgraded Premium member
 * and sends either a match email or a profile completion prompt.
 * Called via non-awaited fetch() from admin tier route.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal secret to prevent unauthorized access
    const secret = request.headers.get('x-internal-secret');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const member = await getMemberById(memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const locale = member.locale || 'vi';
    const result = await generatePremiumMatches(member);

    if (result.status === 'success') {
      await sendPremiumMatchEmail(member.email, member.name, locale, result.matches, member.looking_for);
      console.log(`[PremiumMatch] Match email sent to ${member.email} (${result.matches.length} matches)`);
    } else {
      // profile_incomplete or no_quality_matches → send profile prompt
      await sendProfilePromptEmail(member.email, member.name, locale);
      console.log(`[PremiumMatch] Profile prompt sent to ${member.email} (reason: ${result.status})`);
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (err) {
    console.error('[PremiumMatch] Background job failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
