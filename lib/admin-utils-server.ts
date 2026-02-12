/**
 * Server-only admin utilities
 * Use this in API routes where you need to check admin status with database lookup
 */

import { getMemberByEmail } from '@/lib/google-sheets';
import { isAdminByEmail } from '@/lib/admin-utils';

/**
 * Async check if email has admin privileges
 * Fetches member from database to check is_admin field AND ADMIN_EMAILS env var
 * Use this in API routes where you need to check admin status
 */
export async function isAdminAsync(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;

  // First check env var (fast path)
  if (isAdminByEmail(email)) return true;

  // Then check database is_admin field
  const member = await getMemberByEmail(email);
  return member?.is_admin === true;
}
