/**
 * Admin utilities for access control
 */

import { Member } from '@/types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if an email has admin privileges (via env var)
 */
export function isAdminByEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Check if a member has admin privileges
 * Checks both is_admin field in database and ADMIN_EMAILS env var
 */
export function isAdmin(
  emailOrMember: string | Member | null | undefined
): boolean {
  if (!emailOrMember) return false;

  // If it's a Member object, check both is_admin field and email
  if (typeof emailOrMember === 'object') {
    const member = emailOrMember as Member;
    return member.is_admin === true || isAdminByEmail(member.email);
  }

  // If it's a string (email), check env var only
  return isAdminByEmail(emailOrMember);
}

/**
 * Throw error if email/member is not admin
 */
export function requireAdmin(
  emailOrMember: string | Member | null | undefined
): void {
  if (!isAdmin(emailOrMember)) {
    throw new Error("Unauthorized: Admin access required");
  }
}
