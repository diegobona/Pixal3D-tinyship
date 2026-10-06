import type { Metadata } from "next";
import { translations } from "@libs/i18n";
import type { TutorialTranslations } from "@libs/tutorials/types";
import { tutorialPath, type TutorialSlug } from "@config/tutorials";
import { localizedSeo, type SiteLocale } from "./localized-seo";

export function getTutorialTranslation(locale: SiteLocale): TutorialTranslations {
  return translations[locale].tutorials;
}

export function tutorialMetadata(slug: TutorialSlug, locale: SiteLocale): Metadata {
  const content = getTutorialTranslation(locale).pages[slug];
  const seo = localizedSeo(tutorialPath(slug), locale);
  return {
    title: content.title,
    description: content.description,
    alternates: seo.alternates,
    openGraph: { ...seo.openGraph, type: "article", title: content.title, description: content.description },
    twitter: { card: "summary", title: content.title, description: content.description },
  };
}
