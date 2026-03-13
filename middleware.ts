import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only intercept homepage — authenticated users go to /request
  if (request.nextUrl.pathname === '/') {
    const token = await getToken({ req: request });
    if (token) {
      return NextResponse.redirect(new URL('/request', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
