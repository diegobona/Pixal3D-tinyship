import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];
  
  return {
    title: t.auth.metadata.signin.title,
    description: t.auth.metadata.signin.description,
    keywords: t.auth.metadata.signin.keywords,
    ...localizedSeo("/signin", lang as SiteLocale, { indexable: false }),
  };
}

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
