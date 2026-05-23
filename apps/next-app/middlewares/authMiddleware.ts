import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@libs/auth";
import { i18n } from "../app/i18n-config";

interface ProtectedRouteConfig {
  pattern: RegExp;
  type: "page" | "api";
  requiresAuth?: boolean;
  isAuthRoute?: boolean;
}

const localePrefixPattern = `(?:\\/(${i18n.locales.join("|")}))?`;

function pagePattern(path: string) {
  return new RegExp(`^${localePrefixPattern}${path}$`);
}

function getLocaleFromPathname(pathname: string) {
  const segment = pathname.split("/")[1];
  return i18n.locales.includes(segment as any) ? segment : i18n.defaultLocale;
}

function localizedPath(path: string, locale: string) {
  return locale === i18n.defaultLocale ? path : `/${locale}${path}`;
}

const protectedRoutes: ProtectedRouteConfig[] = [
  { pattern: pagePattern("/signin"), type: "page", requiresAuth: false, isAuthRoute: true },
  { pattern: pagePattern("/signup"), type: "page", requiresAuth: false, isAuthRoute: true },
  { pattern: pagePattern("/dashboard"), type: "page", requiresAuth: true },
  { pattern: new RegExp("^/api/payment/initiate(\\/.*)?$"), type: "api", requiresAuth: true },
  { pattern: new RegExp("^/api/payment/query(\\/.*)?$"), type: "api", requiresAuth: true },
];

export async function authMiddleware(request: NextRequest): Promise<NextResponse | undefined> {
  const pathname = request.nextUrl.pathname;
  const matchedRoute = protectedRoutes.find((route) => route.pattern.test(pathname));

  if (!matchedRoute) return undefined;

  const session = await auth.api.getSession({
    headers: new Headers(request.headers),
  });

  if (matchedRoute.isAuthRoute) {
    if (session?.user) {
      const currentLocale = getLocaleFromPathname(pathname);
      return NextResponse.redirect(new URL(localizedPath("/", currentLocale), request.url));
    }

    return undefined;
  }

  if (!session && matchedRoute.requiresAuth !== false) {
    if (matchedRoute.type === "page") {
      const currentLocale = getLocaleFromPathname(pathname);
      return NextResponse.redirect(new URL(localizedPath("/signin", currentLocale), request.url));
    }

    return new NextResponse("Unauthorized", { status: 401 });
  }

  return undefined;
}
