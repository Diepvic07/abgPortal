import { Member } from "@/types";

export const TIER_LIMITS = {
  basic: {
    freeRequests: 1, // 1 free request total
    dailyLimit: 0,
  },
  premium: {
    freeRequests: Infinity,
    dailyLimit: 50,
  },
} as const;

export type TierType = "basic" | "premium";

export function getMemberTier(member: Member): TierType {
  return member.paid ? "premium" : "basic";
}

export function canMakeRequest(member: Member): {
  allowed: boolean;
  reason?: "limit_reached" | "not_approved" | "account_suspended";
  remaining: number;
} {
  // Check approval status first
  if (member.approval_status === "pending") {
    return { allowed: false, reason: "not_approved", remaining: 0 };
  }

  if (member.approval_status === "rejected") {
    return { allowed: false, reason: "not_approved", remaining: 0 };
  }

  // Check account status
  if (member.account_status === "suspended" || member.account_status === "banned") {
    return { allowed: false, reason: "account_suspended", remaining: 0 };
  }

  const tier = getMemberTier(member);

  if (tier === "premium") {
    const dailyRemaining = TIER_LIMITS.premium.dailyLimit - (member.requests_today || 0);
    return {
      allowed: dailyRemaining > 0,
      reason: dailyRemaining <= 0 ? "limit_reached" : undefined,
      remaining: Math.max(0, dailyRemaining)
    };
  }

  // Basic tier - check free requests
  const used = member.free_requests_used || 0;
  const limit = TIER_LIMITS.basic.freeRequests;

  if (used >= limit) {
    return { allowed: false, reason: "limit_reached", remaining: 0 };
  }

  return { allowed: true, remaining: limit - used };
}

/**
 * Filter profile fields based on viewer's tier
 * Basic: limited info (no phone, linkedin, voice)
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
    voice_url,
    ...limitedProfile
  } = profile;

  return {
    ...limitedProfile,
    phone: undefined,
    linkedin_url: undefined,
    voice_url: undefined,
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
