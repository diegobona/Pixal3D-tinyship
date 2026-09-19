import { NextResponse } from "next/server";
import { config } from "../../../../../config";

const oneYearInSeconds = 60 * 60 * 24 * 365;

function getSafeReturnPath(value: unknown, requestUrl: string) {
  if (typeof value !== "string" || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";

  try {
    const requestOrigin = new URL(requestUrl);
    const destination = new URL(value, requestOrigin);
    if (destination.origin !== requestOrigin.origin) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export async function POST(request: Request) {
  let locale: unknown;
  let returnTo: unknown;
  const isFormPost = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;

  try {
    if (isFormPost) {
      const formData = await request.formData();
      locale = formData.get("locale");
      returnTo = formData.get("returnTo");
    } else {
      ({ locale } = await request.json());
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof locale !== "string" || !config.app.i18n.locales.includes(locale as "en" | "zh-CN")) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const safeReturnTo = getSafeReturnPath(returnTo, request.url);
  const response = isFormPost
    ? new NextResponse(null, { status: 303, headers: { Location: safeReturnTo } })
    : NextResponse.json({ locale });
  response.cookies.set(config.app.i18n.cookieKey, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: oneYearInSeconds,
  });
  return response;
}
