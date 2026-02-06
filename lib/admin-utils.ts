/**
 * Admin utilities for access control
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Check if an email has admin privileges
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Throw error if email is not admin
 */
export function requireAdmin(email: string | null | undefined): void {
  if (!isAdmin(email)) {
    throw new Error("Unauthorized: Admin access required");
  }
}
