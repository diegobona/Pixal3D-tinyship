import type { Metadata } from "next";

export type SiteLocale = "en" | "zh-CN";

export function localizedSitePath(path: string, locale: SiteLocale) {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return locale === "en" ? normalizedPath || "/" : `/zh-CN${normalizedPath}`;
}

export function localizedSeo(
  path: string,
  locale: SiteLocale,
  options: { indexable?: boolean; locales?: SiteLocale[] } = {},
): Pick<Metadata, "alternates" | "openGraph" | "robots"> {
  if (options.indexable === false) {
    return {
      robots: { index: false, follow: false },
      alternates: { languages: {} },
    };
  }

  const availableLocales = options.locales ?? ["en", "zh-CN"];
  const englishPath = localizedSitePath(path, "en");
  const languages: Record<string, string> = {
    en: englishPath,
    "x-default": englishPath,
  };
  if (availableLocales.includes("zh-CN")) {
    languages["zh-CN"] = localizedSitePath(path, "zh-CN");
  }

  return {
    alternates: {
      canonical: localizedSitePath(path, locale),
      languages,
    },
    openGraph: {
      url: localizedSitePath(path, locale),
      locale: locale === "zh-CN" ? "zh_CN" : "en_US",
      alternateLocale: availableLocales
        .filter((candidate) => candidate !== locale)
        .map((candidate) => candidate === "zh-CN" ? "zh_CN" : "en_US"),
    },
  };
}
