import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];

  return {
    title: t.auth.metadata.signup.title,
    description: t.auth.metadata.signup.description,
    keywords: t.auth.metadata.signup.keywords,
    ...localizedSeo("/signup", lang as SiteLocale, { indexable: false }),
  };
}

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
