"use client";

import { useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { config } from "@config";
import { locales, translations, type SupportedLocale, type Translations } from "@libs/i18n";

function createTranslationFunction(dictionary: Translations) {
  return (key: string, params?: Record<string, unknown>) => {
    const value = key.split(".").reduce<unknown>((obj, path) => {
      if (obj && typeof obj === "object" && path in obj) {
        return (obj as Record<string, unknown>)[path];
      }
      return undefined;
    }, dictionary);

    if (!params || typeof value !== "string") {
      return value;
    }

    return Object.entries(params).reduce(
      (message, [paramKey, paramValue]) => message.replace(`{${paramKey}}`, String(paramValue)),
      value
    );
  };
}

export function useTranslation() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = (params?.lang as SupportedLocale) || config.app.i18n.defaultLocale;
  const t = translations[locale] as Translations;
  const tWithParams = createTranslationFunction(t);

  const localizedPath = useCallback(
    (path: string) => (locale === config.app.i18n.defaultLocale ? path : `/${locale}${path}`),
    [locale]
  );

  const changeLocale = (newLocale: SupportedLocale) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
    router.push(
      newLocale === config.app.i18n.defaultLocale
        ? pathWithoutLocale
        : `/${newLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}`
    );
    document.cookie = `${config.app.i18n.cookieKey}=${newLocale}; path=/; max-age=31536000`;
  };

  return {
    t,
    tWithParams,
    locale,
    locales,
    defaultLocale: config.app.i18n.defaultLocale,
    changeLocale,
    localizedPath,
    isDefaultLocale: locale === config.app.i18n.defaultLocale,
  } as const;
}
