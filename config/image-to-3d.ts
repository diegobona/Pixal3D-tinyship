import type { ComparisonModelId, EmbeddedComparisonModelId, IntentPageSlug, PublicModelSample } from "../libs/ai3d/intent-pages";
import modelSampleManifest from "./model-sample-manifest.json";
import { workspaceUrl } from "./space-workspaces";

export const IMAGE_TO_3D_REVIEWED_AT = "2026-10-06";
export const intentPageSlugs: readonly IntentPageSlug[] = ["image-to-3d-model-free-download", "image-to-3d"];
export const comparisonModelIds: readonly ComparisonModelId[] = ["pixal3d", "rodin", "trellis", "hunyuan3d"];

// Actual use entry points, distinct from the reference links below. Verified 2026-10-07.
// The online services retain their own quota, login and export conditions.
export const comparisonActions: Record<ComparisonModelId, { onlineUrl: string; localUrl?: string }> = {
  pixal3d: { onlineUrl: "#workspace-frame", localUrl: "/how-to-install-locally" },
  rodin: { onlineUrl: "https://hyper3d.ai/workspace/rodin" },
  trellis: { onlineUrl: "#workspace-frame", localUrl: "https://github.com/microsoft/TRELLIS.2#installation-steps" },
  hunyuan3d: { onlineUrl: "#workspace-frame", localUrl: "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1#install-requirements" },
};

// A stable resolver applies confirmed failovers on the next iframe load, without a rebuild.
export const intentWorkspaces = {
  "image-to-3d-model-free-download": {
    src: workspaceUrl("pixal3d"),
    sourceUrl: "https://huggingface.co/spaces/victor/pixal3d-studio",
  },
  "image-to-3d": {
    src: workspaceUrl("pixal3d"),
    sourceUrl: "https://huggingface.co/spaces/victor/pixal3d-studio",
  },
} as const;

// Public routes resolve only model-specific verified HF app origins.
export const comparisonWorkspaces: Record<EmbeddedComparisonModelId, { src: string; sourceUrl: string }> = {
  pixal3d: intentWorkspaces["image-to-3d"],
  trellis: { src: workspaceUrl("trellis"), sourceUrl: "https://huggingface.co/spaces/microsoft/TRELLIS.2" },
  hunyuan3d: { src: workspaceUrl("hunyuan3d"), sourceUrl: "https://huggingface.co/spaces/tencent/Hunyuan3D-2.1" },
};

export function isEmbeddedComparisonModel(id: ComparisonModelId): id is EmbeddedComparisonModelId {
  return Object.hasOwn(comparisonWorkspaces, id);
}

export const comparisonSources: Record<ComparisonModelId, readonly string[]> = {
  pixal3d: ["https://github.com/TencentARC/Pixal3D", "https://github.com/TencentARC/Pixal3D/blob/master/inference.py", "https://arxiv.org/html/2605.10922v1"],
  rodin: ["https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5", "https://hyper3d.ai/pricing?lang=en", "https://hyper3d.ai/features/image-to-3d", "https://hyper3d.ai/legal/terms"],
  trellis: ["https://github.com/microsoft/TRELLIS.2", "https://github.com/microsoft/TRELLIS.2/blob/main/example.py", "https://github.com/microsoft/TRELLIS", "https://huggingface.co/spaces/microsoft/TRELLIS.2/blob/main/app.py"],
  hunyuan3d: ["https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/gradio_app.py", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2"],
};

// Refreshed only by the operator after actual generation and geometry validation.
// Existing homepage preview assets are not eligible for this new download library.
export const publicModelSamples: readonly PublicModelSample[] = modelSampleManifest as PublicModelSample[];

export function intentPagePath(slug: IntentPageSlug) {
  return `/${slug}`;
}
