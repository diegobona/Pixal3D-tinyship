import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];

  return {
    title: t.dashboard.metadata.title,
    description: t.dashboard.metadata.description,
    keywords: t.dashboard.metadata.keywords,
    ...localizedSeo("/dashboard", lang as SiteLocale, { indexable: false }),
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
