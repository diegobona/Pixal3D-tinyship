import { TutorialPage } from "@/components/tutorial-page";
import { getTutorialTranslation, tutorialMetadata } from "@/lib/tutorial-metadata";
import type { SiteLocale } from "@/lib/localized-seo";

type Props = { params: Promise<{ lang: SiteLocale }> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  return tutorialMetadata("how-to-install-locally", lang);
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  return <TutorialPage slug="how-to-install-locally" locale={lang} translation={getTutorialTranslation(lang)} />;
}
