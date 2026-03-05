import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getMemberTier } from "@/lib/tier-utils";
import { checkSearchRateLimit, checkSearchQuota, getSearchQuotaInfo, filterSearchResultByTier } from "@/lib/search-utils";
import { addRequestAudit, incrementMemberSearchCount } from "@/lib/supabase-db";
import { vietnameseIncludes } from "@/lib/vietnamese-utils";
import { Member } from "@/types";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const db = createServerSupabaseClient();
    const { data } = await db.from("members").select("abg_class").eq("status", "active").eq("approval_status", "approved");
    const classes = [...new Set((data || []).map(m => m.abg_class).filter(Boolean))].sort() as string[];
    return NextResponse.json({ classes });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch filter options" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  try {
    const member = await requireAuth(request);

    // Rate limit: 10 req/min per email (anti-crawl)
    if (!checkSearchRateLimit(member.email)) {
      addRequestAudit({
        id: crypto.randomUUID(),
        member_id: member.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        failure_reason: "rate_limited",
        request_type: "member_search",
      }).catch(() => {});
      return NextResponse.json(
        { error: "Too many searches. Please wait a moment." },
        { status: 429 }
      );
    }

    // Basic tier: 10 searches/month hard block
    const tier = getMemberTier(member);
    if (tier === "basic") {
      const { allowed } = checkSearchQuota(member);
      if (!allowed) {
        addRequestAudit({
          id: crypto.randomUUID(),
          member_id: member.id,
          ip_address: ip,
          user_agent: userAgent,
          timestamp: new Date().toISOString(),
          success: false,
          failure_reason: "monthly_quota_exceeded",
          request_type: "member_search",
        }).catch(() => {});
        return NextResponse.json(
          { error: "Monthly search limit reached (10/month). Upgrade to Pro for unlimited searches.", remaining: 0 },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { query, filters } = body as {
      query?: string;
      filters?: { name?: string; company?: string; expertise?: string; abg_class?: string };
    };

    // Validate: at least query or one filter
    const hasQuery = query && query.trim().length >= 2;
    const hasFilters = filters && Object.values(filters).some(v => v && v.trim().length > 0);
    if (!hasQuery && !hasFilters) {
      addRequestAudit({
        id: crypto.randomUUID(),
        member_id: member.id,
        ip_address: ip,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        success: false,
        failure_reason: "invalid_query",
        request_type: "member_search",
      }).catch(() => {});
      return NextResponse.json(
        { error: "Provide a search query or at least one filter" },
        { status: 400 }
      );
    }

    const db = createServerSupabaseClient();
    let dbQuery = db.from("members").select("*")
      .eq("status", "active")
      .eq("approval_status", "approved")
      .neq("id", member.id);

    // Class filter stays at DB level (exact match, no diacritics issue)
    if (filters?.abg_class) {
      dbQuery = dbQuery.eq("abg_class", filters.abg_class.trim());
    }

    // Fetch broader set for JS-level Vietnamese-aware filtering
    dbQuery = dbQuery.limit(500);
    const { data, error } = await dbQuery;
    if (error) throw error;

    // Apply text search with Vietnamese diacritics normalization
    type MemberRow = Record<string, string | null>;
    let filtered = (data || []) as MemberRow[];
    if (hasQuery) {
      const q = query!.trim().slice(0, 200);
      filtered = filtered.filter(m =>
        [m.name, m.role, m.company, m.expertise, m.bio]
          .filter((f): f is string => Boolean(f))
          .some(f => vietnameseIncludes(f, q))
      );
    }
    if (filters?.name) {
      filtered = filtered.filter(m => m.name && vietnameseIncludes(m.name, filters.name!.trim()));
    }
    if (filters?.company) {
      filtered = filtered.filter(m => m.company && vietnameseIncludes(m.company, filters.company!.trim()));
    }
    if (filters?.expertise) {
      filtered = filtered.filter(m => m.expertise && vietnameseIncludes(m.expertise, filters.expertise!.trim()));
    }
    filtered = filtered.slice(0, 10);

    const viewerTier = getMemberTier(member);
    const results = filtered.map((row) =>
      filterSearchResultByTier(row as unknown as Member, viewerTier)
    );

    // Audit log (non-blocking)
    addRequestAudit({
      id: crypto.randomUUID(),
      member_id: member.id,
      ip_address: ip,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      success: true,
      request_type: "member_search",
    }).catch(() => {});

    // Increment search counter for Basic tier
    if (viewerTier === "basic") {
      incrementMemberSearchCount(member.id).catch(() => {});
    }

    const searchQuota = viewerTier === "basic"
      ? getSearchQuotaInfo(member)
      : { remaining: null, limit: null };

    return NextResponse.json({
      results,
      total: results.length,
      tier: viewerTier,
      search_quota: searchQuota,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Member search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
