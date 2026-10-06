import type { ComparisonModelId, IntentPageSlug, PublicModelSample } from "../libs/ai3d/intent-pages";
import modelSampleManifest from "./model-sample-manifest.json";

export const IMAGE_TO_3D_REVIEWED_AT = "2026-10-06";
export const intentPageSlugs: readonly IntentPageSlug[] = ["image-to-3d-model-free-download", "image-to-3d"];
export const comparisonModelIds: readonly ComparisonModelId[] = ["pixal3d", "rodin", "trellis", "hunyuan3d"];

// Independent slots let each page change Space without duplicating its UI or copy.
// Reuse the currently embedded public Space while the final selection is deferred.
export const intentWorkspaces = {
  "image-to-3d-model-free-download": {
    src: "https://victor-pixal3d-studio.hf.space",
    sourceUrl: "https://huggingface.co/spaces/victor/pixal3d-studio",
  },
  "image-to-3d": {
    src: "https://victor-pixal3d-studio.hf.space",
    sourceUrl: "https://huggingface.co/spaces/victor/pixal3d-studio",
  },
} as const;

export const comparisonSources: Record<ComparisonModelId, readonly string[]> = {
  pixal3d: ["https://github.com/TencentARC/Pixal3D", "https://github.com/TencentARC/Pixal3D/blob/master/inference.py", "https://arxiv.org/html/2605.10922v1"],
  rodin: ["https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5", "https://hyper3d.ai/pricing?lang=en", "https://hyper3d.ai/features/image-to-3d", "https://hyper3d.ai/legal/terms"],
  trellis: ["https://github.com/microsoft/TRELLIS.2", "https://github.com/microsoft/TRELLIS.2/blob/main/example.py", "https://github.com/microsoft/TRELLIS"],
  hunyuan3d: ["https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/gradio_app.py", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1/blob/main/LICENSE", "https://github.com/Tencent-Hunyuan/Hunyuan3D-2"],
};

// Refreshed only by the operator after actual generation and geometry validation.
// Existing homepage preview assets are not eligible for this new download library.
export const publicModelSamples: readonly PublicModelSample[] = modelSampleManifest as PublicModelSample[];

export function intentPagePath(slug: IntentPageSlug) {
  return `/${slug}`;
}
