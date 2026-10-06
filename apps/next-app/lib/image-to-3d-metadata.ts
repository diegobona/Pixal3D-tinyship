import type { Metadata } from "next";
import { intentPagePath } from "@config/image-to-3d";
import type { ImageTo3DTranslations, IntentPageSlug } from "@libs/ai3d/intent-pages";
import { translations } from "@libs/i18n";
import { localizedSeo, type SiteLocale } from "./localized-seo";

export function getImageTo3DTranslation(locale: SiteLocale): ImageTo3DTranslations {
  return translations[locale].imageTo3D;
}

export function imageTo3DMetadata(slug: IntentPageSlug, locale: SiteLocale): Metadata {
  const translation = getImageTo3DTranslation(locale);
  const content = slug === "image-to-3d" ? translation.comparison : translation.download;
  const seo = localizedSeo(intentPagePath(slug), locale);

  return {
    title: content.title,
    description: content.description,
    alternates: seo.alternates,
    openGraph: { ...seo.openGraph, type: "article", title: content.title, description: content.description },
    twitter: { card: "summary", title: content.title, description: content.description },
  };
}
