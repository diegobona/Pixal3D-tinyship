import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];
  const seo = localizedSeo("/pricing", lang as SiteLocale);
  
  return {
    title: t.pricing.metadata.title,
    description: t.pricing.metadata.description,
    keywords: t.pricing.metadata.keywords,
    alternates: seo.alternates,
    openGraph: { ...seo.openGraph, title: t.pricing.metadata.title, description: t.pricing.metadata.description },
  };
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
