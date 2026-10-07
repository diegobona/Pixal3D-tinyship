import Link from "next/link";
import type { ReactNode } from "react";
import { comparisonModelIds, comparisonSources, IMAGE_TO_3D_REVIEWED_AT, intentPagePath, modelSampleLibraryEnabled, publicModelSamples } from "@config/image-to-3d";
import { tutorialPath, tutorialSlugs } from "@config/tutorials";
import type { ImageTo3DTranslations, IntentFaq, IntentPageSlug } from "@libs/ai3d/intent-pages";
import { IntentWorkspace } from "@/components/intent-workspace";
import { ModelUseLinks } from "@/components/model-use-links";
import { ModelWorkspaceProvider } from "@libs/react-shared/providers/model-workspace-context";
import { localizedSitePath, type SiteLocale } from "@/lib/localized-seo";
import { getTutorialTranslation } from "@/lib/tutorial-metadata";

const bodyClass = "text-sm leading-6 text-[#aebdd0]";
const sectionTitleClass = "text-xl font-semibold tracking-tight text-white sm:text-2xl";
const summaryClass = "cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff]";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#8cd7f7] underline decoration-[#8cd7f7]/25 underline-offset-4 hover:text-white">{children} <span aria-hidden="true">↗</span></a>;
}

function Faq({ title, entries }: { title: string; entries: IntentFaq[] }) {
  return (
    <section id="faq" className="min-w-0 scroll-mt-24" aria-labelledby="faq-title">
      <h2 id="faq-title" className={sectionTitleClass}>{title}</h2>
      <div className="mt-5 divide-y divide-[#263246] border-y border-[#263246]">
        {entries.map((entry) => (
          <details key={entry.question} className="group py-4">
            <summary className={`flex items-start justify-between gap-5 text-sm font-medium leading-6 text-[#dce6f2] sm:text-base ${summaryClass}`}>
              {entry.question}<span aria-hidden="true" className="shrink-0 text-[#7d91aa] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className={`mt-3 max-w-4xl whitespace-pre-line ${bodyClass}`}>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function SampleLibrary({ locale, translation }: { locale: SiteLocale; translation: ImageTo3DTranslations }) {
  const content = translation.download;
  const formatSize = new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", unitDisplay: "short", maximumFractionDigits: 2 });
  return (
    <section id="downloads" data-testid="sample-library" className="min-w-0 scroll-mt-24" aria-labelledby="downloads-title">
      <h2 id="downloads-title" className={sectionTitleClass}>{content.libraryTitle}</h2>
      <p className={`mt-2 max-w-3xl ${bodyClass}`}>{content.libraryIntro}</p>
      <p className="mt-3 text-xs font-medium text-[#9af2dc]">{content.downloadConditions}</p>
      {publicModelSamples.length ? (
        <div className="mt-5 grid min-w-0 gap-4">
          {publicModelSamples.map((sample) => {
            const copy = translation.samples[sample.id];
            return (
              <article key={sample.id} data-testid={`sample-${sample.id}`} className="grid min-w-0 gap-5 rounded-2xl border border-[#263246] bg-[#0c1627] p-4 sm:gap-7 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] items-center gap-3">
                  <figure className="min-w-0">
                    <img data-testid="sample-input" src={sample.referenceImage} alt={copy.referenceAlt} width={768} height={768} loading="lazy" decoding="async" className="aspect-square w-full rounded-xl bg-white object-contain" />
                    <figcaption className="mt-2 text-center text-xs leading-5 text-[#8193ac]">{content.referenceLabel}</figcaption>
                  </figure>
                  {sample.previewImage && <figure className="min-w-0">
                    <img data-testid="sample-result" src={sample.previewImage} alt={`${copy.name}: ${content.resultAlt}`} width={768} height={768} loading="lazy" decoding="async" className="aspect-square w-full rounded-xl bg-[#121f30] object-contain" />
                    <figcaption className="mt-2 text-center text-xs leading-5 text-[#aebdd0]">{content.resultLabel}</figcaption>
                  </figure>}
                </div>
                <div className="min-w-0 py-1">
                  <h3 className="text-xl font-semibold text-white">{copy.name}</h3>
                  <p className={`mt-2 max-w-2xl ${bodyClass}`}>{copy.description}</p>
                  <ul className="mt-5 flex flex-wrap gap-2.5">
                    {sample.files.map((file) => (
                      <li key={file.path}>
                        <a href={file.path} download={file.filename} className="inline-flex min-h-11 items-center gap-3 rounded-lg border border-[#46d9bd]/35 bg-[#46d9bd]/10 px-4 py-2.5 text-sm font-semibold text-[#9af2dc] transition-colors hover:border-[#46d9bd] hover:bg-[#46d9bd]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff]">
                          <span className="text-left"><span className="block">{content.downloadLabel} {file.format}</span><span className="mt-0.5 block text-xs font-normal text-[#aebdd0]">{content.fileNotes[file.format]} · {formatSize.format(file.bytes / 1_000_000)}</span></span>
                          <span aria-hidden="true">↓</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-5 space-y-1.5 border-t border-[#263246] pt-4 text-xs leading-5 text-[#8193ac]">
                    <div className="flex flex-wrap gap-x-2"><dt>{content.provenanceLabel}:</dt><dd><ExternalLink href={sample.sourceUrl}>{copy.provenance}</ExternalLink></dd></div>
                    <div className="flex flex-wrap gap-x-2"><dt>{content.licenseLabel}:</dt><dd><ExternalLink href={sample.licenseUrl}>{copy.license}</ExternalLink></dd></div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[#34506c] p-6">
          <h3 className="font-semibold text-white">{content.libraryEmptyTitle}</h3>
          <p className={`mt-2 ${bodyClass}`}>{content.libraryEmptyBody}</p>
        </div>
      )}
    </section>
  );
}

function DownloadFormats({ translation }: { translation: ImageTo3DTranslations }) {
  const content = translation.download;
  return (
    <section id="formats" className="min-w-0 scroll-mt-24" aria-labelledby="formats-title">
      <h2 id="formats-title" className={sectionTitleClass}>{content.formatsTitle}</h2>
      <div role="table" aria-label={content.formatsTitle} className="mt-5 overflow-hidden rounded-xl border border-[#263246] bg-[#0c1627]">
        <div role="row" className="sr-only border-b border-[#263246] bg-[#101d30] text-xs font-medium text-[#8193ac] sm:not-sr-only sm:grid sm:grid-cols-[70px_1fr_1.5fr] sm:gap-6 sm:px-5 sm:py-3">
          {content.formatHeaders.map((label) => <span key={label} role="columnheader">{label}</span>)}
        </div>
        {content.formatRows.map((row) => (
          <div role="row" key={row.name} className="grid min-w-0 gap-2 border-b border-[#263246] px-5 py-4 last:border-0 sm:grid-cols-[70px_1fr_1.5fr] sm:gap-6">
            <span role="rowheader" className="text-sm font-semibold text-[#9af2dc]">{row.name}</span>
            <p role="cell" className="text-sm leading-6 text-[#dce6f2]">{row.use}</p>
            <p role="cell" className="text-xs leading-5 text-[#aebdd0]">{row.limits}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelComparison({ locale, translation }: { locale: SiteLocale; translation: ImageTo3DTranslations }) {
  const content = translation.comparison;
  const labels = translation.common;
  const fields = ["avoid", "quality", "formats", "runtime", "memory", "time"] as const;
  const quickFields = ["formats", "memory", "time", "quality", "avoid"] as const;
  return (
    <section id="models" className="min-w-0 scroll-mt-24" aria-labelledby="models-title">
      <h2 id="models-title" className={sectionTitleClass}>{content.modelsTitle}</h2>
      <div className="mt-5 grid min-w-0 items-start gap-4 md:grid-cols-2">
        {comparisonModelIds.map((id) => {
          const model = content.models[id];
          return (
            <article id={`model-${id}`} key={id} data-testid={`model-comparison-${id}`} className="flex min-w-0 scroll-mt-24 flex-col rounded-2xl border border-[#263246] bg-[#0c1627] p-5 sm:p-6">
              <h3 className="text-xl font-semibold text-white">{model.name}</h3>
              {model.version && <p className="mt-1 text-xs leading-5 text-[#70cbb8]">{model.version}</p>}
              <dl className="mb-4 mt-4 border-l-2 border-[#46d9bd]/40 pl-3">
                <dt className="text-xs font-medium text-[#dce6f2]">{labels.suitable}</dt>
                <dd className={`mt-1 ${bodyClass}`}>{model.suitable}</dd>
              </dl>
              <div data-testid={`model-access-${id}`} className="mb-4 rounded-xl border border-[#31465b] bg-[#101d30] p-3.5">
                <p className="text-xs font-medium text-[#9af2dc]">{content.accessLabel}</p>
                <p className="mb-3 mt-1.5 text-xs leading-5 text-[#c3d0e0]">{model.access}</p>
                <ModelUseLinks id={id} locale={locale} translation={translation} />
              </div>
              <dl data-testid={`model-facts-${id}`} className="mb-4 divide-y divide-[#263246]">
                {quickFields.map((field) => <div key={field} className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] gap-3 py-2.5">
                  <dt className="text-xs font-medium leading-5 text-[#8193ac]">{labels[field]}</dt>
                  <dd className="min-w-0 text-xs leading-5 text-[#c3d0e0]">{model.quickFacts[field]}</dd>
                </div>)}
              </dl>
              <details data-testid={`model-details-${id}`} className="group mt-auto border-t border-[#263246] pt-4">
                <summary className={`flex min-h-7 items-center justify-between gap-4 text-sm font-medium text-[#8cd7f7] ${summaryClass}`}>
                  {labels.details}<span aria-hidden="true" className="text-[#7d91aa] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className={`mt-3 ${bodyClass}`}>{model.summary}</p>
                <dl className="mt-3 divide-y divide-[#263246]">
                  {fields.map((field) => (
                    <div key={field} className="grid min-w-0 gap-1 py-3 sm:grid-cols-[100px_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-xs font-medium leading-6 text-[#dce6f2]">{labels[field]}</dt>
                      <dd className={`min-w-0 ${bodyClass}`}>{model[field]}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 border-t border-[#263246] pt-4">
                  <h4 className="text-xs font-medium text-[#8193ac]">{labels.sources}</h4>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-5">
                    {comparisonSources[id].map((source, index) => <li key={source}><ExternalLink href={source}>{model.sourceLabels[index]}</ExternalLink></li>)}
                  </ul>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ImageTo3DPage({ slug, locale, translation }: { slug: IntentPageSlug; locale: SiteLocale; translation: ImageTo3DTranslations }) {
  const isComparison = slug === "image-to-3d";
  const content = isComparison ? translation.comparison : translation.download;
  const tutorialTranslation = getTutorialTranslation(locale);
  const relatedSlug = isComparison ? "image-to-3d-model-free-download" : "image-to-3d";
  const page = (
    <div data-testid="intent-page" className="min-h-screen min-w-0 bg-[#080f1d] bg-[radial-gradient(ellipse_at_top,#122640_0%,transparent_55%)] text-white [overflow-wrap:anywhere]">
      <div className="mx-auto min-w-0 max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8">
        <header data-testid="intent-page-header" className="mb-6 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl xl:text-4xl">{content.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#aebdd0]">{content.summary}</p>
          </div>
          {(isComparison || modelSampleLibraryEnabled) && <a href={isComparison ? "#models" : "#downloads"} className={`inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-3 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#48bdff] ${isComparison ? "border-[#43617c] bg-[#15263a] text-[#a8e8f7] hover:border-[#8cd7f7] hover:bg-[#1b3047]" : "border-[#70e6cc] bg-[#70e6cc] text-[#08201e] hover:bg-[#9af2dc]"}`}>
            {content.jump}<span aria-hidden="true">↓</span>
          </a>}
        </header>
        <article className="min-w-0">
          <IntentWorkspace slug={slug} locale={locale} translation={translation} />
          <div data-testid="intent-supporting-content" className="mx-auto mt-12 min-w-0 max-w-[1120px] space-y-10 sm:mt-14 sm:space-y-12">
            {isComparison ? <ModelComparison locale={locale} translation={translation} /> : <>{modelSampleLibraryEnabled && <SampleLibrary locale={locale} translation={translation} />}<DownloadFormats translation={translation} /></>}
            <Faq title={content.faqTitle} entries={content.faq} />
            <nav data-testid="intent-related-links" aria-label={content.relatedTitle} className="min-w-0 border-t border-[#263246] pt-6">
              <h2 className="text-sm font-medium text-[#aebdd0]">{content.relatedTitle}</h2>
              <ul className="mt-3 flex min-w-0 flex-wrap gap-x-6 gap-y-3">
                <li><Link href={localizedSitePath(intentPagePath(relatedSlug), locale)} className="inline-flex min-h-9 items-center gap-2 text-sm text-[#9af2dc] hover:text-white">{isComparison ? translation.common.downloadLink : translation.common.compareLink}<span aria-hidden="true">→</span></Link></li>
                {tutorialSlugs.map((tutorial) => <li key={tutorial}><Link href={localizedSitePath(tutorialPath(tutorial), locale)} className="inline-flex min-h-9 items-center text-sm text-[#8cd7f7] hover:text-white">{tutorialTranslation.pages[tutorial].title}</Link></li>)}
              </ul>
            </nav>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#263246] pt-5 text-xs text-[#8193ac]">
              <Link href={localizedSitePath("/", locale)} className="inline-flex min-h-9 items-center hover:text-white"><span aria-hidden="true">←&nbsp;</span>{translation.common.home}</Link>
              <p>{translation.common.reviewed} <time dateTime={IMAGE_TO_3D_REVIEWED_AT}>{IMAGE_TO_3D_REVIEWED_AT}</time></p>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
  return isComparison ? <ModelWorkspaceProvider>{page}</ModelWorkspaceProvider> : page;
}
