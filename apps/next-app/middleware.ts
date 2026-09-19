import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { config as appConfig } from "../../config";
import { resolvePreferredLocale } from "../../libs/i18n/locale-negotiation";
import {
  PIXAL3D_SHOW_MONETIZATION_SURFACES,
  PIXAL3D_SHOW_USER_LIBRARY_SURFACES,
} from "./lib/pixal3d-surface-visibility";

const { defaultLocale, locales, cookieKey } = appConfig.app.i18n;
type SupportedLocale = (typeof locales)[number];
const localePrefixPattern = `(?:\\/(${locales.join("|")}))?`;
const localeVaryHeaders = [
  "Cookie",
  "Accept-Language",
  "CF-IPCountry",
  "X-Vercel-IP-Country",
  "CloudFront-Viewer-Country",
];
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

function getExplicitLocale(pathname: string): SupportedLocale | undefined {
  const segment = pathname.split("/")[1];
  return locales.includes(segment as SupportedLocale)
    ? segment as SupportedLocale
    : undefined;
}

function localizedPath(path: string, locale: SupportedLocale) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function getCountryCode(request: NextRequest) {
  return request.headers.get("cf-ipcountry")
    ?? request.headers.get("x-vercel-ip-country")
    ?? request.headers.get("cloudfront-viewer-country");
}

function getRequestLocale(request: NextRequest): SupportedLocale {
  return getExplicitLocale(request.nextUrl.pathname) ?? resolvePreferredLocale({
    cookieLocale: request.cookies.get(cookieKey)?.value,
    acceptLanguage: request.headers.get("accept-language"),
    countryCode: getCountryCode(request),
  });
}

function applyLocaleCacheHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", localeVaryHeaders.join(", "));
  return response;
}

function redirectToLocalizedPath(
  request: NextRequest,
  path: string,
  locale: SupportedLocale,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = localizedPath(path, locale);
  return applyLocaleCacheHeaders(NextResponse.redirect(redirectUrl));
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
    return redirectToLocalizedPath(request, "/signin", getRequestLocale(request));
  }

  return undefined;
}

function edgeHiddenPageRedirect(request: NextRequest): NextResponse | undefined {
  const pathname = request.nextUrl.pathname;
  const isHiddenPage = hiddenPagePatterns.some((pattern) => pattern.test(pathname));

  if (!isHiddenPage) {
    return undefined;
  }

  return redirectToLocalizedPath(request, "/", getRequestLocale(request));
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
    const locale = getRequestLocale(request);
    if (locale !== defaultLocale) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
      return applyLocaleCacheHeaders(NextResponse.redirect(redirectUrl));
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return applyLocaleCacheHeaders(NextResponse.rewrite(rewriteUrl));
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
