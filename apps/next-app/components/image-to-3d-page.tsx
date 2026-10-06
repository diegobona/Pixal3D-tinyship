import Link from "next/link";
import type { ReactNode } from "react";
import {
  comparisonModelIds,
  comparisonSources,
  IMAGE_TO_3D_REVIEWED_AT,
  intentPagePath,
  publicModelSamples,
} from "@config/image-to-3d";
import { tutorialPath, tutorialSlugs } from "@config/tutorials";
import type { ImageTo3DTranslations, IntentFaq, IntentPageSlug, IntentTextBlock } from "@libs/ai3d/intent-pages";
import { IntentWorkspace } from "@/components/intent-workspace";
import { localizedSitePath, type SiteLocale } from "@/lib/localized-seo";
import { getTutorialTranslation } from "@/lib/tutorial-metadata";

const bodyClass = "text-sm leading-7 text-[#bec9df] sm:text-base";
const sectionTitleClass = "text-2xl font-bold tracking-tight sm:text-3xl";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-[#8cd7f7] underline decoration-[#8cd7f7]/30 underline-offset-4 hover:text-white">
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

function TextBlocks({ entries, numbered = false }: { entries: IntentTextBlock[]; numbered?: boolean }) {
  return (
    <ol className={`grid min-w-0 gap-4 ${entries.length === 4 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
      {entries.map((entry, index) => (
        <li key={entry.title} className="min-w-0 rounded-xl border border-[#25314f] bg-[#0b1937] p-5 sm:p-6">
          {numbered ? <p aria-hidden="true" className="mb-4 text-sm font-semibold text-[#6ee7c2]">{String(index + 1).padStart(2, "0")}</p> : null}
          <h3 className="text-lg font-semibold leading-7 text-white">{entry.title}</h3>
          <p className={`mt-3 whitespace-pre-line ${bodyClass}`}>{entry.body}</p>
        </li>
      ))}
    </ol>
  );
}

function Faq({ title, entries }: { title: string; entries: IntentFaq[] }) {
  return (
    <section id="faq" className="min-w-0 scroll-mt-24" aria-labelledby="faq-title">
      <h2 id="faq-title" className={sectionTitleClass}>{title}</h2>
      <div className="mt-6 divide-y divide-[#25314f] border-y border-[#25314f]">
        {entries.map((entry) => (
          <details key={entry.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-base font-semibold leading-7 text-white [&::-webkit-details-marker]:hidden">
              {entry.question}<span aria-hidden="true" className="shrink-0 text-[#6ee7c2] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className={`mt-4 max-w-4xl whitespace-pre-line ${bodyClass}`}>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function SampleLibrary({ locale, translation }: { locale: SiteLocale; translation: ImageTo3DTranslations }) {
  const content = translation.download;
  const formatSize = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "megabyte",
    unitDisplay: "short",
    maximumFractionDigits: 2,
  });

  return (
    <section id="downloads" data-testid="sample-library" className="min-w-0 scroll-mt-24" aria-labelledby="downloads-title">
      <h2 id="downloads-title" className={sectionTitleClass}>{content.libraryTitle}</h2>
      <p className={`mt-4 max-w-4xl ${bodyClass}`}>{content.libraryIntro}</p>
      {publicModelSamples.length ? (
        <div className="mt-6 grid min-w-0 gap-6 sm:grid-cols-2">
          {publicModelSamples.map((sample) => {
            const copy = translation.samples[sample.id];
            return (
              <article key={sample.id} data-testid={`sample-${sample.id}`} className="min-w-0 overflow-hidden rounded-xl border border-[#25314f] bg-[#0b1937]">
                <figure className="border-b border-[#25314f]">
                  <img src={sample.referenceImage} alt={copy.referenceAlt} width={768} height={768} loading="lazy" decoding="async" className="aspect-square max-h-[360px] w-full bg-[#050e23] object-contain" />
                  <figcaption className="px-5 py-3 text-xs text-[#93a4c2]">{content.referenceLabel}</figcaption>
                </figure>
                <div className="p-5 sm:p-6">
                  <h3 className="text-xl font-semibold text-white">{copy.name}</h3>
                  <p className={`mt-3 ${bodyClass}`}>{copy.description}</p>
                  <ul className="mt-5 flex flex-wrap gap-3">
                    {sample.files.map((file) => (
                      <li key={file.path}>
                        <a href={file.path} download={file.filename} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#6ee7c2]/35 bg-[#6ee7c2]/10 px-4 py-3 text-sm font-semibold text-[#9bffe1] hover:border-[#6ee7c2] hover:bg-[#6ee7c2]/15">
                          <span>{content.downloadLabel} {file.format}</span>
                          <span className="text-xs font-normal text-[#bec9df]">{formatSize.format(file.bytes / 1_000_000)}</span>
                          <span aria-hidden="true">↓</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-5 space-y-3 text-xs leading-6 text-[#93a4c2]">
                    <div><dt className="font-semibold">{content.provenanceLabel}</dt><dd><ExternalLink href={sample.sourceUrl}>{copy.provenance}</ExternalLink></dd></div>
                    <div><dt className="font-semibold">{content.licenseLabel}</dt><dd><ExternalLink href={sample.licenseUrl}>{copy.license}</ExternalLink></dd></div>
                  </dl>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-[#355073] bg-[#0b1937] p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">{content.libraryEmptyTitle}</h3>
          <p className={`mt-3 max-w-3xl ${bodyClass}`}>{content.libraryEmptyBody}</p>
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
      <div className="mt-6 max-w-full overflow-x-auto rounded-xl border border-[#25314f]">
        <table className="w-full min-w-[640px] text-left text-sm leading-7">
          <thead className="bg-[#102347] text-[#b6e8ff]"><tr>{content.formatHeaders.map((header, index) => <th key={header} scope="col" className={`p-4 sm:p-5 ${index === 0 ? "whitespace-nowrap" : ""}`}>{header}</th>)}</tr></thead>
          <tbody>{content.formatRows.map((row) => (
            <tr key={row.name} className="border-t border-[#25314f] align-top text-[#bec9df]">
              <th scope="row" className="whitespace-nowrap p-4 font-semibold text-white sm:p-5">{row.name}</th>
              <td className="p-4 sm:p-5">{row.use}</td>
              <td className="p-4 sm:p-5">{row.limits}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function ModelComparison({ translation }: { translation: ImageTo3DTranslations }) {
  const content = translation.comparison;
  const labels = translation.common;
  const fields = ["suitable", "avoid", "quality", "formats", "runtime", "memory", "time"] as const;

  return (
    <section id="models" className="min-w-0 scroll-mt-24" aria-labelledby="models-title">
      <h2 id="models-title" className={sectionTitleClass}>{content.modelsTitle}</h2>
      <p className={`mt-4 max-w-4xl ${bodyClass}`}>{content.modelsIntro}</p>
      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        {comparisonModelIds.map((id) => {
          const model = content.models[id];
          return (
            <article key={id} data-testid={`model-comparison-${id}`} className="min-w-0 rounded-xl border border-[#25314f] bg-[#0b1937] p-5 sm:p-7">
              <h3 className="text-2xl font-bold text-white">{model.name}</h3>
              <p className="mt-2 text-xs font-semibold leading-6 text-[#6ee7c2]">{model.version}</p>
              <p className={`mt-4 ${bodyClass}`}>{model.summary}</p>
              <dl className="mt-6 divide-y divide-[#25314f] border-y border-[#25314f]">
                {fields.map((field) => (
                  <div key={field} className="grid min-w-0 gap-1 py-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-xs font-semibold leading-6 text-[#b6e8ff] sm:text-sm">{labels[field]}</dt>
                    <dd className="min-w-0 text-sm leading-6 text-[#bec9df]">{model[field]}</dd>
                  </div>
                ))}
              </dl>
              {comparisonSources[id].length ? (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-[#93a4c2]">{labels.sources}</h4>
                  <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-6">
                    {comparisonSources[id].map((source, index) => <li key={source}><ExternalLink href={source}>{model.sourceLabels[index]}</ExternalLink></li>)}
                  </ul>
                </div>
              ) : null}
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
  const jumpLabel = isComparison ? translation.comparison.jump : translation.download.jump;
  const tutorialTranslation = getTutorialTranslation(locale);
  const relatedSlug = isComparison ? "image-to-3d-model-free-download" : "image-to-3d";

  return (
    <div data-testid="intent-page" className="min-h-screen min-w-0 bg-[#071431] text-white [overflow-wrap:anywhere]">
      <div className="mx-auto min-w-0 max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <Link href={localizedSitePath("/", locale)} className="text-sm text-[#8cd7f7] hover:text-white"><span aria-hidden="true">← </span>{translation.common.home}</Link>
        <header className="mt-8 min-w-0 border-b border-[#25314f] pb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#6ee7c2]">{content.eyebrow}</p>
          <h1 className="mt-4 max-w-5xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="mt-5 max-w-4xl text-base leading-8 text-[#bec9df] sm:text-lg">{content.summary}</p>
          <a href={isComparison ? "#models" : "#downloads"} className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#6ee7c2] px-5 py-3 text-sm font-bold text-[#071431] transition-colors hover:bg-[#9bffe1]">
            {jumpLabel}<span aria-hidden="true">↓</span>
          </a>
          <p className="mt-5 text-xs leading-6 text-[#93a4c2]">{translation.common.reviewed} <time dateTime={IMAGE_TO_3D_REVIEWED_AT}>{IMAGE_TO_3D_REVIEWED_AT}</time></p>
        </header>
        <article className="mt-10 min-w-0 space-y-12 sm:mt-12 sm:space-y-16">
          {isComparison ? (
            <>
              <ModelComparison translation={translation} />
              <section id="selection" className="min-w-0 scroll-mt-24" aria-labelledby="selection-title">
                <h2 id="selection-title" className={`mb-6 ${sectionTitleClass}`}>{translation.comparison.selectionTitle}</h2>
                <TextBlocks entries={translation.comparison.selection} />
              </section>
            </>
          ) : (
            <>
              <SampleLibrary locale={locale} translation={translation} />
              <section id="workflow" className="min-w-0 scroll-mt-24" aria-labelledby="workflow-title">
                <h2 id="workflow-title" className={`mb-6 ${sectionTitleClass}`}>{translation.download.workflowTitle}</h2>
                <TextBlocks entries={translation.download.workflow} numbered />
              </section>
              <DownloadFormats translation={translation} />
            </>
          )}
          <IntentWorkspace slug={slug} locale={locale} translation={translation} />
          <Faq title={isComparison ? translation.comparison.faqTitle : translation.download.faqTitle} entries={isComparison ? translation.comparison.faq : translation.download.faq} />
          <nav data-testid="intent-related-links" aria-label={content.relatedTitle} className="min-w-0 border-t border-[#25314f] pt-8">
            <h2 className="mb-6 text-xl font-bold">{content.relatedTitle}</h2>
            <ul className="grid min-w-0 gap-4 sm:grid-cols-2">
              <li><Link href={localizedSitePath(intentPagePath(relatedSlug), locale)} className="block h-full rounded-lg border border-[#6ee7c2]/35 bg-[#6ee7c2]/5 p-4 text-sm leading-7 text-[#9bffe1] hover:border-[#6ee7c2] hover:text-white">{isComparison ? translation.common.downloadLink : translation.common.compareLink} <span aria-hidden="true">→</span></Link></li>
              {tutorialSlugs.map((tutorial) => (
                <li key={tutorial}><Link href={localizedSitePath(tutorialPath(tutorial), locale)} className="block h-full rounded-lg border border-[#25314f] p-4 text-sm leading-7 text-[#8cd7f7] hover:border-[#6ee7c2]/50 hover:text-white">{tutorialTranslation.pages[tutorial].title} <span aria-hidden="true">→</span></Link></li>
              ))}
            </ul>
          </nav>
        </article>
      </div>
    </div>
  );
}
