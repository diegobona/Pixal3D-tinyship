import { comparisonModelIds, comparisonWorkspaces, intentWorkspaces, isEmbeddedComparisonModel, modelSampleLibraryEnabled } from "@config/image-to-3d";
import type { ImageTo3DTranslations, IntentPageSlug } from "@libs/ai3d/intent-pages";
import { translations } from "@libs/i18n";
import { LazyIframe } from "@libs/react-shared/components/lazy-iframe";
import type { SiteLocale } from "@/lib/localized-seo";
import { ModelOnlineLink } from "@/components/model-use-links";
import { ModelWorkspacePanels } from "@libs/react-shared/components/model-workspace-panels";

const frameClass = "h-[900px] min-h-[900px] w-full bg-[#0b0f1a] sm:h-[940px] sm:min-h-[940px] lg:h-[960px] lg:min-h-[960px]";

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
  const intent = slug === "image-to-3d" ? "compare" : "download";
  const isComparison = slug === "image-to-3d";

  return (
    <section id="workspace" className="min-w-0 scroll-mt-24" aria-label={isComparison ? translation.comparison.modelNavigation : labels.title}>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[#34506c] bg-[#0b0f1a] shadow-[0_20px_80px_-30px_#000000]">
        <div data-testid="intent-workspace-bar" className="min-w-0 border-b border-[#28394e] bg-[#101d30] px-4 py-4 sm:px-6">
          {slug === "image-to-3d-model-free-download" ? (
            <>
            <ol data-testid="download-workflow" className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#c3d0e0] sm:gap-x-8 sm:text-sm">
              {translation.download.workspaceSteps.map((step, index) => <li key={step} className="flex items-center gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#3c596b] text-[10px] text-[#8ee5cf]">{index + 1}</span>{step}</li>)}
            </ol>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#aebdd0]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mt-0.5 h-4 w-4 shrink-0 text-[#8ee5cf]">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" />
              </svg>
              <span>{translation.download.downloadFallbackHint}</span>
            </p>
            </>
          ) : (
            <nav data-testid="model-navigation" aria-label={translation.comparison.modelNavigation} className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {comparisonModelIds.map((id) => {
                const model = translation.comparison.models[id];
                return <div key={id} className="flex min-w-0 flex-col items-start">
                  <a href={`#model-${id}`} className="mb-2 inline-flex min-h-10 max-w-full items-center gap-2 rounded-sm text-xl font-bold leading-tight tracking-tight text-[#9af2dc] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff] sm:text-2xl"><span className="min-w-0">{model.shortName}</span><span aria-hidden="true" className="shrink-0 text-sm font-normal text-[#8193ac]">↓</span></a>
                  <p className="hidden text-xs leading-5 text-[#aebdd0] sm:block">{model.focus}</p>
                  <p className="mb-2 text-[11px] leading-5 text-[#94c5c3]">{model.accessBadge}</p>
                  <div className="mt-auto"><ModelOnlineLink id={id} translation={translation} /></div>
                </div>;
              })}
            </nav>
          )}
        </div>
        {isComparison && <noscript><p className="border-b border-[#28394e] p-4 text-sm text-[#aebdd0]">{translation.comparison.noScriptSwitch}</p></noscript>}
        <div id="workspace-frame" className="scroll-mt-24">
        {isComparison ? <ModelWorkspacePanels
          frames={comparisonModelIds.filter(isEmbeddedComparisonModel).map((id) => ({
            id,
            src: comparisonWorkspaces[id].src,
            title: translation.comparison.workspaceTitle.replace("{model}", translation.comparison.models[id].shortName),
            testId: id === "pixal3d" ? "intent-workspace-compare" : `intent-workspace-${id}`,
          }))}
          labels={labels}
          className={frameClass}
        /> : <LazyIframe
          loadImmediately
          testId={`intent-workspace-${intent}`}
          title={labels.title}
          src={workspace.src}
          labels={labels}
          className={frameClass}
        />}
        </div>
      </div>
      {slug === "image-to-3d-model-free-download" && (
        <div data-testid="download-export-help" className="flex flex-col gap-3 border-b border-[#263246] px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-3xl text-sm leading-6 text-[#c3d0e0]">{translation.download.exportHint}</p>
          {modelSampleLibraryEnabled && <a href="#downloads" className="inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-medium text-[#9af2dc] underline decoration-[#46d9bd]/30 underline-offset-4 hover:text-white">{translation.download.jump}<span aria-hidden="true">↓</span></a>}
        </div>
      )}
    </section>
  );
}
