import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !(await isAdminAsync(session.user.email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const company = searchParams.get('company');
    const country = searchParams.get('country');
    const abg_class = searchParams.get('abg_class');
    const expertise = searchParams.get('expertise');

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true });

    if (name) query = query.ilike('name', `%${name}%`);
    if (role) query = query.ilike('role', `%${role}%`);
    if (company) query = query.ilike('company', `%${company}%`);
    if (country) query = query.eq('country', country);
    if (abg_class) query = query.eq('abg_class', abg_class);
    if (expertise) query = query.ilike('expertise', `%${expertise}%`);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('[AdminSearch] Query error:', error);
      return NextResponse.json({ error: 'Failed to search members' }, { status: 500 });
    }

    // Get distinct values for dropdown filters
    const { data: allMembers } = await supabase
      .from('members')
      .select('country, abg_class, expertise');

    const countries = [...new Set((allMembers || []).map(m => m.country).filter(Boolean))].sort() as string[];
    const classes = [...new Set((allMembers || []).map(m => m.abg_class).filter(Boolean))].sort() as string[];
    const industries = [...new Set((allMembers || []).map(m => m.expertise).filter(Boolean))].sort() as string[];

    return NextResponse.json({
      members: members || [],
      total: count || 0,
      filters: { countries, classes, industries },
    });
  } catch (error) {
    console.error('[AdminSearch] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
