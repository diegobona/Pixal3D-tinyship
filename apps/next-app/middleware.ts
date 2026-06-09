import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  PIXAL3D_SHOW_MONETIZATION_SURFACES,
  PIXAL3D_SHOW_USER_LIBRARY_SURFACES,
} from "./lib/pixal3d-surface-visibility";

const defaultLocale = "en";
const locales = ["en", "zh-CN"] as const;
const localePrefixPattern = `(?:\\/(${locales.join("|")}))?`;
const protectedPagePatterns = [
  pagePattern("/dashboard"),
  pagePattern("/my-assets"),
];
const hiddenPagePatterns = [
  ...(!PIXAL3D_SHOW_MONETIZATION_SURFACES ? [pagePattern("/pricing")] : []),
  ...(!PIXAL3D_SHOW_USER_LIBRARY_SURFACES ? [pagePattern("/dashboard"), pagePattern("/my-assets")] : []),
];

function pagePattern(path: string) {
  return new RegExp(`^${localePrefixPattern}${path}$`);
}

function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split("/")[1];
  return locales.includes(segment as any) ? segment : defaultLocale;
}

function localizedPath(path: string, locale: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function hasBetterAuthSessionCookie(request: NextRequest) {
  const names = request.cookies.getAll().map((cookie) => cookie.name);
  return names.some((name) => {
    const normalized = name.replace(/^__Secure-/, "");
    return normalized === "better-auth.session_token"
      || normalized === "better-auth.session-token"
      || normalized.startsWith("better-auth.session_token.")
      || normalized.startsWith("better-auth.session-token.");
  });
}

function edgeAuthRedirect(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;
  const isProtectedPage = protectedPagePatterns.some((pattern) => pattern.test(pathname));

  if (isProtectedPage && !hasBetterAuthSessionCookie(request)) {
    const locale = getLocaleFromPathname(pathname);
    return NextResponse.redirect(new URL(localizedPath("/signin", locale), request.url));
  }

  return undefined;
}

function edgeHiddenPageRedirect(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;
  const isHiddenPage = hiddenPagePatterns.some((pattern) => pattern.test(pathname));

  if (!isHiddenPage) {
    return undefined;
  }

  const locale = getLocaleFromPathname(pathname);
  return NextResponse.redirect(new URL(localizedPath("/", locale), request.url));
}

function edgeLocaleResponse(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return undefined;
  }

  const defaultLocalePrefix = `/${defaultLocale}`;
  if (pathname === defaultLocalePrefix || pathname.startsWith(`${defaultLocalePrefix}/`)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.slice(defaultLocalePrefix.length) || "/";
    return NextResponse.redirect(redirectUrl);
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return undefined;
}

export function middleware(request: NextRequest) {
  const hiddenPageResponse = edgeHiddenPageRedirect(request);
  if (hiddenPageResponse) {
    return hiddenPageResponse;
  }

  const authResponse = edgeAuthRedirect(request);
  if (authResponse) {
    return authResponse;
  }

  const localeResponse = edgeLocaleResponse(request);
  if (localeResponse) {
    return localeResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.[^/]+$).*)",
  ],
};
