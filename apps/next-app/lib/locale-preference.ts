import type { SupportedLocale } from "@libs/i18n";
import { config } from "../../../config";

export function stripLocalePrefix(pathname: string, locale: SupportedLocale) {
  const safePathname = pathname || "/";
  if (locale === config.app.i18n.defaultLocale) return safePathname;

  const prefix = `/${locale}`;
  if (safePathname === prefix) return "/";
  if (safePathname.startsWith(`${prefix}/`)) return safePathname.slice(prefix.length);
  return safePathname;
}

export function getLocalePath(
  pathname: string,
  currentLocale: SupportedLocale,
  nextLocale: SupportedLocale,
) {
  const pathWithoutLocale = stripLocalePrefix(pathname, currentLocale);
  return nextLocale === config.app.i18n.defaultLocale
    ? pathWithoutLocale
    : `/${nextLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`;
}

export async function persistLocalePreference(locale: SupportedLocale) {
  const response = await fetch("/api/locale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale }),
  });

  if (!response.ok) {
    throw new Error("Could not save locale preference");
  }
}
