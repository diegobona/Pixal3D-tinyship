export const tutorialSlugs = ["how-to-install-locally", "gguf", "low-vram", "comfyui"] as const;

export type TutorialSlug = (typeof tutorialSlugs)[number];

export const TUTORIAL_REVIEWED_AT = "2026-10-06";

export function tutorialPath(slug: TutorialSlug) {
  return `/${slug}`;
}
