import { translations } from "@libs/i18n";
import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = translations[lang as keyof typeof translations];
  
  return {
    title: t.payment.metadata.cancel.title,
    description: t.payment.metadata.cancel.description,
    keywords: t.payment.metadata.cancel.keywords,
    ...localizedSeo("/payment-cancel", lang as SiteLocale, { indexable: false }),
  };
}

export default function PaymentCancelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
