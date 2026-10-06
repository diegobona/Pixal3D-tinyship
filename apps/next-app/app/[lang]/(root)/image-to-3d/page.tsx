import { ImageTo3DPage } from "@/components/image-to-3d-page";
import { getImageTo3DTranslation, imageTo3DMetadata } from "@/lib/image-to-3d-metadata";
import type { SiteLocale } from "@/lib/localized-seo";

type Props = { params: Promise<{ lang: SiteLocale }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return imageTo3DMetadata("image-to-3d", lang);
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  return <ImageTo3DPage slug="image-to-3d" locale={lang} translation={getImageTo3DTranslation(lang)} />;
}
