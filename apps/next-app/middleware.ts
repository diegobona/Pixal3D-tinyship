import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { localeMiddleware } from './middlewares/localeMiddleware';
import { authMiddleware } from './middlewares/authMiddleware';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  console.log(`Middleware start for: ${pathname}`);

  if (
    /^\/(_next|images)\/.*$/.test(pathname) ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const authStart = Date.now();
  const authResponse = await authMiddleware(request);
  console.log(`Auth middleware: ${Date.now() - authStart}ms`);
  if (authResponse) {
    console.log(`Auth response for: ${pathname}`);
    return authResponse;
  }

  // Run locale handling after auth so clean default-locale paths like
  // /dashboard still pass through the same protection as /en/dashboard.
  const localeStart = Date.now();
  const localeResponse = localeMiddleware(request);
  console.log(`Locale middleware: ${Date.now() - localeStart}ms`);
  if (localeResponse) {
    console.log(`Locale redirect/rewrite for: ${pathname}`);
    return localeResponse;
  }

  const totalTime = Date.now() - startTime;
  console.log(`Middleware completed for: ${pathname} in ${totalTime}ms`);
  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!_next|images|[\\w-]+\\.\\w+).*)',
  ],
};
