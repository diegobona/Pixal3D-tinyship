import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@libs/auth";
import { list3DGenerationRecordsByUser } from "@libs/ai/3d-task-store";
import { translations } from "@libs/i18n";
import { config } from "@config";
import { MyAssetsGrid } from "@/components/my-assets-grid";

function localizedPath(path: string, locale: string) {
  return locale === config.app.i18n.defaultLocale ? path : `/${locale}${path}`;
}

function formatDate(value: Date, locale: string) {
  return value.toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function MyAssetsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as keyof typeof translations;
  const t = translations[locale]?.myAssets || translations.en.myAssets;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect(localizedPath("/signin", lang));
  }

  const records = await list3DGenerationRecordsByUser(session.user.id);
  const items = records.map((record) => ({
    id: record.id,
    prompt: record.prompt,
    inputImageUrl: record.inputImageUrl,
    previewImageUrl: record.result?.thumbnailUrl || record.inputImageUrl,
    modelUrl: record.result?.modelUrl,
    status: record.status,
    resolution: record.resolution,
    textureSize: record.textureSize,
    createdAtLabel: formatDate(record.createdAt, lang),
  }));

  return (
    <main
      className="min-h-screen bg-[#06132e] px-4 py-10 text-white sm:px-6 lg:px-8"
      data-testid="my-assets-page"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#48bdff]">{t.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl" data-testid="my-assets-title">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-base text-white/65">{t.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={localizedPath("/my-assets", lang)}
              className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/78 transition hover:border-white/22 hover:bg-white/[0.08] hover:text-white"
            >
              {t.actions.refresh}
            </Link>
            <Link
              href={localizedPath("/", lang)}
              className="inline-flex items-center justify-center rounded-full bg-[#1de9a6] px-5 py-2.5 text-sm font-bold text-[#04151b] transition hover:brightness-110"
            >
              {t.actions.create}
            </Link>
          </div>
        </div>

        {records.length === 0 ? (
          <section
            className="rounded-[28px] border border-[#263653] bg-[#0a1530] px-6 py-16 text-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
            data-testid="my-assets-empty-state"
          >
            <h2 className="text-2xl font-bold">{t.empty.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-white/62">{t.empty.description}</p>
            <Link
              href={localizedPath("/", lang)}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#48bdff] px-5 py-2.5 text-sm font-bold text-[#04101e] transition hover:bg-[#72ceff]"
            >
              {t.actions.create}
            </Link>
          </section>
        ) : (
          <MyAssetsGrid
            items={items}
            labels={{
              createdAt: t.card.createdAt,
              targetResolution: t.card.targetResolution,
              textureSize: t.card.textureSize,
              preview3DModel: t.actions.preview3DModel,
              previewTitle: translations[locale]?.pixal3d.generator.previewTitle || translations.en.pixal3d.generator.previewTitle,
              closePreview: translations[locale]?.pixal3d.generator.closePreviewButton || translations.en.pixal3d.generator.closePreviewButton,
              downloadGlb: translations[locale]?.pixal3d.generator.downloadModelButton || translations.en.pixal3d.generator.downloadModelButton,
              status: t.card.status,
            }}
          />
        )}
      </div>
    </main>
  );
}
