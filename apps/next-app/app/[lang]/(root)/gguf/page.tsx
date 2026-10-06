import { TutorialPage } from "@/components/tutorial-page";
import { getTutorialTranslation, tutorialMetadata } from "@/lib/tutorial-metadata";
import type { SiteLocale } from "@/lib/localized-seo";

type Props = { params: Promise<{ lang: SiteLocale }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return tutorialMetadata("gguf", lang);
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  return <TutorialPage slug="gguf" locale={lang} translation={getTutorialTranslation(lang)} />;
}
