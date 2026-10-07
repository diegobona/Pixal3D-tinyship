import { comparisonActions } from "@config/image-to-3d";
import type { ComparisonModelId, ImageTo3DTranslations } from "@libs/ai3d/intent-pages";
import { localizedSitePath, type SiteLocale } from "@/lib/localized-seo";
import { ModelOnlineAction } from "@/components/model-online-action";

export function ModelOnlineLink({ id, translation }: { id: ComparisonModelId; translation: ImageTo3DTranslations }) {
  const content = translation.comparison;
  return <ModelOnlineAction id={id} name={content.models[id].shortName} tryHere={content.tryHere} openOnline={content.openOnline} />;
}

export function ModelUseLinks({ id, locale, translation }: { id: ComparisonModelId; locale: SiteLocale; translation: ImageTo3DTranslations }) {
  const localUrl = comparisonActions[id].localUrl;
  const external = localUrl?.startsWith("https://");
  return <div data-testid={`model-actions-${id}`} className="flex flex-wrap items-center gap-3">
    <ModelOnlineLink id={id} translation={translation} />
    {localUrl && <a href={external ? localUrl : localizedSitePath(localUrl, locale)} target={external ? "_blank" : undefined} rel={external ? "noreferrer noopener" : undefined} className="inline-flex min-h-10 items-center gap-2 px-1 text-xs font-medium text-[#8cd7f7] underline decoration-[#8cd7f7]/25 underline-offset-4 hover:text-white">{translation.comparison.localSetup}<span aria-hidden="true">{external ? "↗" : "→"}</span></a>}
  </div>;
}
