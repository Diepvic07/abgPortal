import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminAsync } from '@/lib/admin-utils-server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { vietnameseIncludes } from '@/lib/vietnamese-utils';
import { getAbgClasses } from '@/lib/supabase-db';

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

    let dbQuery = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true });

    // Exact-match filters stay at DB level
    if (country) dbQuery = dbQuery.eq('country', country);
    if (abg_class) dbQuery = dbQuery.eq('abg_class', abg_class);

    const { data: rawMembers, error } = await dbQuery;
    if (error) {
      console.error('[AdminSearch] Query error:', error);
      return NextResponse.json({ error: 'Failed to search members' }, { status: 500 });
    }

    // Apply text filters with Vietnamese diacritics normalization
    type MemberRow = Record<string, string | null>;
    let members = (rawMembers || []) as MemberRow[];
    if (name) members = members.filter(m => m.name && vietnameseIncludes(m.name, name));
    if (role) members = members.filter(m => m.role && vietnameseIncludes(m.role, role));
    if (company) members = members.filter(m => m.company && vietnameseIncludes(m.company, company));
    if (expertise) members = members.filter(m => m.expertise && vietnameseIncludes(m.expertise, expertise));
    const count = members.length;

    // Get distinct values for dropdown filters
    const { data: allMembers } = await supabase
      .from('members')
      .select('country, expertise');

    const countries = [...new Set((allMembers || []).map(m => m.country).filter(Boolean))].sort() as string[];
    const abgClasses = await getAbgClasses(true);
    const classes = abgClasses.map(c => c.name);
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
