import type { Metadata } from "next";
import { localizedSeo, type SiteLocale } from "@/lib/localized-seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return localizedSeo("/my-assets", lang as SiteLocale, { indexable: false });
}

export default function MyAssetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
