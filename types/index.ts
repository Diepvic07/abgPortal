export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  expertise: string;
  can_help_with: string;
  looking_for: string;
  bio: string;
  avatar_url?: string;
  status: 'active' | 'inactive';
  paid: boolean;
  free_requests_used: number;
  created_at: string;
  phone?: string;
  facebook_url?: string;
  linkedin_url?: string;
  company_website?: string;
  country?: string;
  open_to_work?: boolean;
  job_preferences?: string;
  hiring?: boolean;
  hiring_preferences?: string;
  gender?: 'Female' | 'Male' | 'Undisclosed';
  relationship_status?: string;
  birth_year?: string;
  // Auth and security fields
  auth_provider?: string;
  auth_provider_id?: string;
  last_login?: string;
  account_status?: 'active' | 'suspended' | 'banned';
  total_requests_count?: number;
  requests_today?: number;
  // New profile fields (columns AG-AN)
  abg_class?: string;
  nickname?: string;
  display_nickname_in_search?: boolean;
  display_nickname_in_match?: boolean;
  display_nickname_in_email?: boolean;
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'expired';
  membership_expiry?: string;
  // Approval fields (columns AO-AP)
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_csv_imported?: boolean;
  // Admin field (column AQ)
  is_admin?: boolean;
  // Dating profile fields (columns AR-BA)
  self_description?: string;      // AR (43) - 3 adjectives describing self
  truth_lie?: string;             // AS (44) - 2 truths 1 lie game
  ideal_day?: string;             // AT (45) - narrative description
  qualities_looking_for?: string; // AU (46) - partner expectations
  core_values?: string;           // AV (47) - personal values
  deal_breakers?: string;         // AW (48) - relationship no-gos
  interests?: string;             // AX (49) - hobbies
  dating_message?: string;        // AY (50) - open message to matches
  other_share?: string;           // AZ (51) - additional context
  dating_profile_complete?: boolean; // BA (52) - has filled dating section
  // Monthly tracking fields (columns BB-BC, indices 53-54)
  requests_this_month?: number;      // BB (53) - monthly usage for Pro
  month_reset_date?: string;         // BC (54) - ISO date of current tracking month
  // Search tracking fields (premium plan)
  searches_this_month?: number;
  search_month_reset_date?: string;
}

// Membership status for badge display
export type MembershipStatus = 'premium' | 'basic' | 'pending' | 'grace-period' | 'expired';

// Helper function to derive membership status from member data
export function getMembershipStatus(member: Member): MembershipStatus {
  // Check payment status first
  if (member.payment_status === 'pending') return 'pending';

  // Check if member has paid status
  if (!member.paid && member.payment_status !== 'paid') {
    return 'basic';
  }

  // Check membership expiry if paid
  if (member.membership_expiry) {
    const expiry = new Date(member.membership_expiry);
    const now = new Date();
    const gracePeriodEnd = new Date(expiry);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    if (now > gracePeriodEnd) return 'expired';
    if (now > expiry) return 'grace-period';
  }

  return 'premium';
}

// Derive display status for avatar badge: admin > pro > basic
export function getAvatarMemberStatus(member: Member): 'basic' | 'pro' | 'admin' {
  // Only display admin badge if the user is actually approved
  if (member.is_admin && member.approval_status === 'approved') return 'admin';
  if (member.paid || member.payment_status === 'paid') return 'pro';
  return 'basic';
}

export interface AbgClass {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export type RequestCategory = 'love' | 'job' | 'hiring' | 'partner';

export interface ConnectionRequest {
  id: string;
  requester_id: string;
  request_text: string;
  matched_ids: string;
  selected_id?: string;
  status: 'pending' | 'matched' | 'connected' | 'declined';
  created_at: string;
  category?: RequestCategory;
  custom_intro_text?: string;
}

export interface Connection {
  id: string;
  request_id: string;
  from_id: string;
  to_id: string;
  intro_sent: boolean;
  feedback?: string;
  created_at: string;
}

export interface MatchResult {
  id: string;
  reason: string;
  match_score?: number;
  member?: Member;
}

export interface LoveMatchRequest {
  id: string;
  request_id: string;
  from_id: string;
  to_id: string;
  status: 'pending' | 'accepted' | 'refused' | 'ignored';
  from_profile_shared: string;
  to_profile_shared?: string;
  viewed_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  requester_id: string;
  target_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  feedback?: string;
  token: string;
  created_at: string;
  responded_at?: string;
  source?: 'direct' | 'ai_match';
  connection_request_id?: string;
}

export interface PaymentRecord {
  id: string;
  member_id: string;
  amount_vnd: number;
  admin_id: string;
  notes?: string;
  created_at: string;
}

export type BugReportStatus = 'open' | 'fixed' | 'wontfix';

export interface BugReport {
  id: string;
  reporter_email: string;
  page_url: string;
  description: string;
  screenshot_url?: string;
  status: BugReportStatus;
  created_at: string;
}

export type NewsCategory = 'Edu' | 'Business' | 'Event' | 'Course' | 'Announcement';

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  excerpt: string;
  content: string;
  image_url?: string;
  author_name: string;
  published_date: string;
  is_published_vi: boolean;
  is_published_en: boolean;
  is_featured: boolean;
  created_at: string;
  title_vi?: string;
  excerpt_vi?: string;
  content_vi?: string;
}
