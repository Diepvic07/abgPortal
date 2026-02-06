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
  voice_url?: string;
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
  discord_username?: string;
  payment_status?: 'unpaid' | 'pending' | 'paid' | 'expired';
  membership_expiry?: string;
  // Approval fields (columns AO-AP)
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_csv_imported?: boolean;
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

export interface ConnectionRequest {
  id: string;
  requester_id: string;
  request_text: string;
  matched_ids: string;
  selected_id?: string;
  status: 'pending' | 'matched' | 'connected' | 'declined';
  created_at: string;
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
  member?: Member;
}
