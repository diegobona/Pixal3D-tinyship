import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { i18n } from '../app/i18n-config'; // Adjusted import path

export function localeMiddleware(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;

  // --- Skip API routes in locale middleware ---
  if (pathname.startsWith('/api/')) {
    return undefined; // API routes don't need locale redirects
  }

  const defaultLocalePrefix = `/${i18n.defaultLocale}`;

  // Default locale URLs should stay clean: /pricing instead of /en/pricing.
  if (pathname === defaultLocalePrefix || pathname.startsWith(`${defaultLocalePrefix}/`)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.slice(defaultLocalePrefix.length) || '/';
    return NextResponse.redirect(redirectUrl);
  }

  const pathnameHasLocale = i18n.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Default pages should render the default locale without showing /en in the URL.
  if (!pathnameHasLocale) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${i18n.defaultLocale}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // If locale exists, continue to the next middleware
  return undefined; 
} 
