import { Member } from "@/types";

export const TIER_LIMITS = {
  basic: {
    lifetime_requests: 3,
    max_results_per_request: 3,
  },
  premium: {
    monthly_limit: 100,
    daily_soft_cap: 20,
    max_results_per_request: 10,
  },
} as const;

export type TierType = "basic" | "premium";

export function getMemberTier(member: Member): TierType {
  if (!member.paid) return "basic";
  // Immediate downgrade when expired (no grace period)
  if (member.membership_expiry) {
    const expiry = new Date(member.membership_expiry);
    if (new Date() > expiry) {
      return "basic";
    }
  }
  return "premium";
}

export function getDaysUntilExpiry(member: Member): number | null {
  if (!member.membership_expiry) return null;
  const expiry = new Date(member.membership_expiry);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a member's monthly counter needs resetting (calendar month).
 * Returns true if reset was needed.
 */
export function checkMonthlyReset(member: Member): { needsReset: boolean; currentMonth: string } {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const resetMonth = member.month_reset_date
    ? member.month_reset_date.slice(0, 7)
    : '';
  return { needsReset: resetMonth !== currentMonth, currentMonth };
}

export function canMakeRequest(member: Member): {
  allowed: boolean;
  warning?: string;
  reason?: "limit_reached" | "not_approved" | "account_suspended";
  remaining: number;
} {
  // Check approval status first
  if (member.approval_status === "pending" || member.approval_status === "rejected") {
    return { allowed: false, reason: "not_approved", remaining: 0 };
  }

  // Check account status
  if (member.account_status === "suspended" || member.account_status === "banned") {
    return { allowed: false, reason: "account_suspended", remaining: 0 };
  }

  const tier = getMemberTier(member);

  if (tier === "premium") {
    // Monthly reset check — if month changed, treat requests_this_month as 0
    const { needsReset } = checkMonthlyReset(member);
    const monthlyUsed = needsReset ? 0 : (member.requests_this_month || 0);
    const monthlyRemaining = TIER_LIMITS.premium.monthly_limit - monthlyUsed;

    if (monthlyRemaining <= 0) {
      return { allowed: false, reason: "limit_reached", remaining: 0 };
    }

    // Daily soft-cap — warning only, still allowed
    const dailyUsed = member.requests_today || 0;
    const warning = dailyUsed >= TIER_LIMITS.premium.daily_soft_cap
      ? `You've made ${dailyUsed} requests today. Consider spreading requests across days.`
      : undefined;

    return { allowed: true, warning, remaining: monthlyRemaining };
  }

  // Basic tier - check lifetime requests (3 total)
  const used = member.free_requests_used || 0;
  const limit = TIER_LIMITS.basic.lifetime_requests;

  if (used >= limit) {
    return { allowed: false, reason: "limit_reached", remaining: 0 };
  }

  return { allowed: true, remaining: limit - used };
}

/**
 * Filter profile fields based on viewer's tier
 * Basic: limited info (no phone, linkedin)
 * Premium: full access
 */
export function filterProfileByTier(
  profile: Member,
  viewerTier: TierType
): Partial<Member> {
  // Premium sees everything
  if (viewerTier === "premium") {
    return profile;
  }

  // Basic sees limited info - hide sensitive contact details
  const {
    phone,
    linkedin_url,
    ...limitedProfile
  } = profile;

  return {
    ...limitedProfile,
    phone: undefined,
    linkedin_url: undefined,
  };
}

/**
 * Blur text for soft block display
 * Keeps first and last character, replaces middle with dots
 */
export function blurText(text: string, showFirst = 2): string {
  if (!text || text.length <= showFirst * 2) {
    return "*".repeat(text?.length || 4);
  }
  const firstPart = text.slice(0, showFirst);
  const lastPart = text.slice(-showFirst);
  const middleLength = Math.min(text.length - showFirst * 2, 8);
  return `${firstPart}${"*".repeat(middleLength)}${lastPart}`;
}

/**
 * Create blurred match result for soft block
 */
export function createBlurredMatch(match: {
  id: string;
  reason: string;
  member?: Member;
}) {
  if (!match.member) return null;

  return {
    id: match.id,
    name: blurText(match.member.name, 2),
    role: blurText(match.member.role || "", 3),
    company: blurText(match.member.company || "", 3),
    reason: match.reason, // Keep reason visible as teaser
    blurred: true,
  };
}
