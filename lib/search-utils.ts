import { Member } from "@/types";
import { TierType } from "./tier-utils";

// Rate limiter: 10 req/min per user email (in-memory)
const SEARCH_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const SEARCH_RATE_LIMIT_MAX = 10;
const searchHistory: Record<string, number[]> = {};

export function checkSearchRateLimit(email: string): boolean {
  const now = Date.now();
  if (!searchHistory[email]) searchHistory[email] = [];
  searchHistory[email] = searchHistory[email].filter(
    (ts) => now - ts < SEARCH_RATE_LIMIT_WINDOW_MS
  );
  if (searchHistory[email].length >= SEARCH_RATE_LIMIT_MAX) return false;
  searchHistory[email].push(now);
  return true;
}

// Basic tier: 10 searches/month hard block
const BASIC_MONTHLY_SEARCH_LIMIT = 10;

export function checkSearchQuota(member: Member): { allowed: boolean; remaining: number } {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (member.search_month_reset_date !== currentMonth) {
    // New month - counter will be reset on first search
    return { allowed: true, remaining: BASIC_MONTHLY_SEARCH_LIMIT };
  }
  const used = member.searches_this_month || 0;
  const remaining = BASIC_MONTHLY_SEARCH_LIMIT - used;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}

export function getSearchQuotaInfo(member: Member): { remaining: number; limit: number } {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const used = member.search_month_reset_date === currentMonth
    ? (member.searches_this_month || 0)
    : 0;
  return { remaining: Math.max(0, BASIC_MONTHLY_SEARCH_LIMIT - used), limit: BASIC_MONTHLY_SEARCH_LIMIT };
}

// Search result types - fields visible per tier
export interface SearchResultBasic {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface SearchResultPro extends SearchResultBasic {
  role: string;
  company: string;
  expertise: string;
  bio: string;
  abg_class?: string;
}

export function filterSearchResultByTier(
  member: Member,
  viewerTier: TierType
): SearchResultBasic | SearchResultPro {
  const base: SearchResultBasic = {
    id: member.id,
    name: member.name,
    avatar_url: member.avatar_url,
  };
  if (viewerTier === "premium") {
    return {
      ...base,
      role: member.role || "",
      company: member.company || "",
      expertise: member.expertise || "",
      bio: member.bio || "",
      abg_class: member.abg_class,
    };
  }
  return base;
}
