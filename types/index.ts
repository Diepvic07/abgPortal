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
  // Duplicate detection fields
  potential_duplicate_of?: string;
  duplicate_note?: string;
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
  // Locale preference for emails
  locale?: 'en' | 'vi';
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

// Self-registered member with complete profile → "Verified"
export function isMemberVerified(member: Member): boolean {
  if (member.is_csv_imported) return false;
  return Boolean(member.name && member.email && member.role && member.company);
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

// Community Proposals
export type ProposalCategory = 'charity' | 'event' | 'learning' | 'community_support' | 'other';
export type ProposalStatus = 'published' | 'selected' | 'in_progress' | 'completed' | 'archived' | 'removed';
export type CommitmentLevel = 'interested' | 'will_participate' | 'will_lead';
export type CommentStatus = 'visible' | 'hidden' | 'removed';

export const COMMITMENT_WEIGHTS: Record<CommitmentLevel, number> = {
  interested: 0,
  will_participate: 3,
  will_lead: 5,
};

export const COMMITMENT_LABELS: Record<CommitmentLevel, { en: string; vi: string }> = {
  interested: { en: 'Interested', vi: 'Quan tâm' },
  will_participate: { en: 'Will Participate', vi: 'Sẽ tham gia' },
  will_lead: { en: 'Will Lead', vi: 'Sẽ dẫn dắt' },
};

export const PROPOSAL_CATEGORY_LABELS: Record<ProposalCategory, { en: string; vi: string }> = {
  charity: { en: 'Charity', vi: 'Từ thiện' },
  event: { en: 'Event', vi: 'Sự kiện' },
  learning: { en: 'Learning', vi: 'Học tập' },
  community_support: { en: 'Community Support', vi: 'Hỗ trợ cộng đồng' },
  other: { en: 'Other', vi: 'Khác' },
};

export interface CommunityProposal {
  id: string;
  created_by_member_id: string;
  title: string;
  description: string;
  category: ProposalCategory;
  status: ProposalStatus;
  is_pinned: boolean;
  commitment_score: number;
  commitment_count: number;
  comment_count: number;
  target_date?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  selected_at?: string;
  selected_by_member_id?: string;
  completed_at?: string;
  admin_note?: string;
  image_url?: string;
  // Joined fields
  author_name?: string;
  author_avatar_url?: string;
  author_abg_class?: string;
  my_commitment?: CommitmentLevel;
}

export interface CommunityCommitment {
  id: string;
  proposal_id: string;
  member_id: string;
  commitment_level: CommitmentLevel;
  created_at: string;
  updated_at: string;
  // Joined fields
  member_name?: string;
  member_avatar_url?: string;
  member_abg_class?: string;
}

export interface CommunityProposalComment {
  id: string;
  proposal_id: string;
  member_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  member_name?: string;
  member_avatar_url?: string;
}

// Community Events
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventCategory = 'charity' | 'event' | 'learning' | 'community_support' | 'networking' | 'other';
export type EventMode = 'offline' | 'online' | 'hybrid';
export type EventRegistrationLevel = Extract<CommitmentLevel, 'will_participate' | 'will_lead'>;

export const EVENT_CATEGORY_LABELS: Record<EventCategory, { en: string; vi: string }> = {
  charity: { en: 'Charity', vi: 'Từ thiện' },
  event: { en: 'Event', vi: 'Sự kiện' },
  learning: { en: 'Learning', vi: 'Học tập' },
  community_support: { en: 'Community Support', vi: 'Hỗ trợ cộng đồng' },
  networking: { en: 'Networking', vi: 'Kết nối' },
  other: { en: 'Other', vi: 'Khác' },
};

export const EVENT_STATUS_LABELS: Record<EventStatus, { en: string; vi: string; color: string }> = {
  draft: { en: 'Draft', vi: 'Bản nháp', color: 'gray' },
  published: { en: 'Published', vi: 'Đã đăng', color: 'green' },
  cancelled: { en: 'Cancelled', vi: 'Đã hủy', color: 'red' },
  completed: { en: 'Completed', vi: 'Hoàn thành', color: 'blue' },
};

export const EVENT_MODE_LABELS: Record<EventMode, { en: string; vi: string }> = {
  offline: { en: 'Offline', vi: 'Trực tiếp' },
  online: { en: 'Online', vi: 'Trực tuyến' },
  hybrid: { en: 'Hybrid', vi: 'Kết hợp' },
};

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  event_mode?: EventMode;
  event_date: string;
  event_end_date?: string;
  location?: string;
  location_url?: string;
  capacity?: number;
  capacity_premium?: number;
  capacity_basic?: number;
  image_url?: string;
  created_by_member_id: string;
  proposal_id?: string;
  status: EventStatus;
  rsvp_count: number;
  rsvp_score: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  completed_at?: string;
  outcome_summary?: string;
  // Joined fields
  author_name?: string;
  author_avatar_url?: string;
  author_abg_class?: string;
  my_rsvp?: CommitmentLevel;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  member_id: string;
  commitment_level: CommitmentLevel;
  note?: string;
  actual_attendance?: boolean;
  actual_participation_score?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  member_name?: string;
  member_avatar_url?: string;
  member_abg_class?: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  member_id: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  member_name?: string;
  member_avatar_url?: string;
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
