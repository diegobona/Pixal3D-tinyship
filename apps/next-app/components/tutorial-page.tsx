import Link from "next/link";
import { tutorialPath, tutorialSlugs, TUTORIAL_REVIEWED_AT, type TutorialSlug } from "@config/tutorials";
import type { TutorialContent, TutorialSource, TutorialStep, TutorialTranslations } from "@libs/tutorials/types";
import { localizedSitePath, type SiteLocale } from "@/lib/localized-seo";

function Sources({ sources, label }: { sources: TutorialSource[]; label: string }) {
  if (!sources.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-[#8cd7f7]" aria-label={label}>
      {sources.map((source) => (
        <li key={source.href}>
          <a href={source.href} target="_blank" rel="noreferrer noopener" className="underline decoration-[#8cd7f7]/30 underline-offset-4 hover:text-white">{source.label} ↗</a>
        </li>
      ))}
    </ul>
  );
}

function Entries({ entries, sourceLabel, numbered = false }: { entries: TutorialStep[]; sourceLabel: string; numbered?: boolean }) {
  return (
    <div className="space-y-5">
      {entries.map((entry, index) => (
        <div key={entry.title} className="min-w-0 rounded-xl border border-[#25314f] bg-[#0b1937] p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-white">
            {numbered ? <span className="mr-3 text-[#6ee7c2]">{index + 1}.</span> : null}{entry.title}
          </h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#bec9df] sm:text-base">{entry.body}</p>
          {entry.command ? (
            <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-[#293d59] bg-[#050e23] p-4 text-xs leading-6 text-[#a7f3d0] sm:text-sm"><code>{entry.command}</code></pre>
          ) : null}
          <Sources sources={entry.sources} label={sourceLabel} />
        </div>
      ))}
    </div>
  );
}

export function TutorialPage({ slug, locale, translation }: { slug: TutorialSlug; locale: SiteLocale; translation: TutorialTranslations }) {
  const content: TutorialContent = translation.pages[slug];
  const labels = translation.common;
  const sections = ["requirements", "steps", "performance", "errors", "files", "screenshots"] as const;

  return (
    <div className="min-h-screen bg-[#071431] text-white [overflow-wrap:anywhere]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <Link href={localizedSitePath("/", locale)} className="text-sm text-[#8cd7f7] hover:text-white">← {labels.home}</Link>
        <header className="mt-8 max-w-4xl border-b border-[#25314f] pb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#6ee7c2]">{labels.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#bec9df] sm:text-lg">{content.summary}</p>
          <p className="mt-5 text-xs text-[#93a4c2]">{labels.reviewedAt} <time dateTime={TUTORIAL_REVIEWED_AT}>{TUTORIAL_REVIEWED_AT}</time></p>
        </header>
        <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label={labels.onThisPage} className="h-fit rounded-xl border border-[#25314f] bg-[#0b1937] p-5 lg:sticky lg:top-24">
            <p className="mb-4 text-sm font-semibold">{labels.onThisPage}</p>
            <ol className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section) => <li key={section}><a href={`#${section}`} className="text-[#aebed8] hover:text-[#6ee7c2]">{labels[section]}</a></li>)}
            </ol>
          </nav>
          <article data-testid="tutorial-article" className="min-w-0 space-y-12">
            <section id="requirements" className="scroll-mt-24">
              <h2 className="mb-5 text-2xl font-bold">{labels.requirements}</h2>
              <Entries entries={content.requirements} sourceLabel={labels.source} />
            </section>
            <section id="steps" className="scroll-mt-24">
              <h2 className="mb-5 text-2xl font-bold">{labels.steps}</h2>
              <Entries entries={content.steps} sourceLabel={labels.source} numbered />
            </section>
            <section id="performance" className="scroll-mt-24">
              <h2 className="mb-5 text-2xl font-bold">{labels.performance}</h2>
              <p className="mb-5 text-sm leading-7 text-[#bec9df] sm:text-base">{content.performance.intro}</p>
              <div className="overflow-x-auto rounded-xl border border-[#25314f]">
                <table className="w-full min-w-[590px] text-left text-sm leading-6">
                  <thead className="bg-[#102347] text-[#b6e8ff]"><tr>
                    <th scope="col" className="p-4">{labels.configuration}</th><th scope="col" className="p-4">{labels.memory}</th><th scope="col" className="p-4">{labels.time}</th><th scope="col" className="p-4">{labels.evidence}</th>
                  </tr></thead>
                  <tbody>{content.performance.rows.map((row) => <tr key={row.configuration} className="border-t border-[#25314f] align-top text-[#bec9df]">
                    <th scope="row" className="p-4 font-medium text-white">{row.configuration}</th><td className="p-4">{row.memory}</td><td className="p-4">{row.time}</td><td className="p-4">{row.evidence}<Sources sources={row.sources} label={labels.source} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
            </section>
            <section id="errors" className="scroll-mt-24"><h2 className="mb-5 text-2xl font-bold">{labels.errors}</h2><Entries entries={content.errors} sourceLabel={labels.source} /></section>
            <section id="files" className="scroll-mt-24"><h2 className="mb-5 text-2xl font-bold">{labels.files}</h2><Entries entries={content.files} sourceLabel={labels.source} /></section>
            <section id="screenshots" className="scroll-mt-24">
              <h2 className="mb-5 text-2xl font-bold">{labels.screenshots}</h2>
              <p className="mb-5 text-sm leading-7 text-[#bec9df]">{content.screenshots.intro}</p>
              <div className="space-y-6">{content.screenshots.items.map((item) => (
                <figure key={item.src} className="overflow-hidden rounded-xl border border-[#25314f] bg-[#0b1937]">
                  <a href={item.source.href} target="_blank" rel="noreferrer noopener">
                    <img src={item.src} alt={item.alt} width={1600} height={900} loading="lazy" decoding="async" className="aspect-video max-h-[600px] w-full bg-[#050e23] object-contain" />
                  </a>
                  <figcaption className="p-5 text-sm leading-6 text-[#bec9df]">{item.caption}<Sources sources={[item.source]} label={labels.source} /></figcaption>
                </figure>
              ))}</div>
            </section>
            <nav data-testid="tutorial-related" aria-label={labels.related} className="border-t border-[#25314f] pt-8">
              <h2 className="mb-5 text-xl font-bold">{labels.related}</h2>
              <ul className="grid gap-4 sm:grid-cols-2">{tutorialSlugs.filter((other) => other !== slug).map((other) => (
                <li key={other}><Link href={localizedSitePath(tutorialPath(other), locale)} className="block h-full rounded-lg border border-[#25314f] p-4 text-sm leading-6 text-[#8cd7f7] hover:border-[#6ee7c2]/50 hover:text-white">{translation.pages[other].title} →</Link></li>
              ))}</ul>
            </nav>
          </article>
        </div>
      </div>
    </div>
  );
}
