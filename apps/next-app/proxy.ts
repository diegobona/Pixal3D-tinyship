import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authMiddleware } from "./middlewares/authMiddleware";
import { localeMiddleware } from "./middlewares/localeMiddleware";

export async function proxy(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse) {
    return authResponse;
  }

  const localeResponse = localeMiddleware(request);
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
