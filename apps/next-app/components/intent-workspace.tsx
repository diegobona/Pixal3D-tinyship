import { intentWorkspaces } from "@config/image-to-3d";
import type { ImageTo3DTranslations, IntentPageSlug } from "@libs/ai3d/intent-pages";
import { translations } from "@libs/i18n";
import { LazyIframe } from "@libs/react-shared/components/lazy-iframe";
import type { SiteLocale } from "@/lib/localized-seo";

/** Next's localized page adapter for the shared, session-preserving embed. */
export function IntentWorkspace({
  slug,
  locale,
  translation,
}: {
  slug: IntentPageSlug;
  locale: SiteLocale;
  translation: ImageTo3DTranslations;
}) {
  const workspace = intentWorkspaces[slug];
  const labels = translations[locale].embed;
  const content = slug === "image-to-3d" ? translation.comparison : translation.download;
  const intent = slug === "image-to-3d" ? "compare" : "download";

  return (
    <section id="workspace" className="min-w-0 scroll-mt-24" aria-labelledby="workspace-title">
      <h2 id="workspace-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{translation.common.workspaceTitle}</h2>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[#bec9df] sm:text-base">{content.workspaceNote}</p>
      <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-[#25314f] bg-[#0b0f1a]">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#25314f] bg-[#0b1937] px-4 py-4 sm:px-6">
          <p className="text-sm font-semibold text-white">{labels.title}</p>
        </div>
        <LazyIframe
          testId={`intent-workspace-${intent}`}
          title={labels.title}
          src={workspace.src}
          labels={labels}
          className="h-[900px] min-h-[900px] w-full bg-[#0b0f1a] sm:h-[940px] sm:min-h-[940px] lg:h-[960px] lg:min-h-[960px]"
        />
      </div>
    </section>
  );
}
