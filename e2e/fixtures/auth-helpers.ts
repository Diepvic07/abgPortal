import { encode } from 'next-auth/jwt';
import dotenv from 'dotenv';
import path from 'path';
import { BrowserContext, Page } from '@playwright/test';

// Load the NEXTAUTH_SECRET from .env.local so we can create valid JWTs
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET not found in .env.local — required for E2E auth');
}

/**
 * Generate a valid next-auth JWT session token that passes server-side
 * `getServerSession()` checks (used by pages like /history).
 */
export async function generateSessionToken(user: {
  id?: string;
  email: string;
  name?: string;
  image?: string;
}): Promise<string> {
  return encode({
    token: {
      email: user.email,
      name: user.name ?? 'Test User',
      picture: user.image,
      sub: user.id ?? user.email,
    },
    secret: NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Set up full auth for E2E tests — works for both client-side `useSession()`
 * and server-side `getServerSession()`.
 */
export async function setupE2EAuth(
  page: Page,
  context: BrowserContext,
  user: { id: string; email: string; name?: string; tier?: string },
) {
  const token = await generateSessionToken(user);

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      domain: '127.0.0.1',
      path: '/',
    },
  ]);

  // Also mock the client-side session API for useSession() hook
  await page.route('**/api/auth/session', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name, tier: user.tier },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });
}
