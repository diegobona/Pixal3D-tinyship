import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next home page layout", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );
  const globalCssSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "globals.css"),
    "utf8",
  );

  it("keeps hero title descenders from feeling clipped", () => {
    const heroTitleClass = pageSource.match(/<h1 className="([^"]+)"/)?.[1] ?? "";

    expect(heroTitleClass).toContain("leading-[1.12]");
    expect(heroTitleClass).toContain("pb-2");
    expect(heroTitleClass).toContain("text-[38px]");
    expect(heroTitleClass).toContain("sm:text-[56px]");
    expect(heroTitleClass).not.toContain("sm:text-[64px]");
  });

  it("places a compact free trial callout above the generator card", () => {
    const freeTrialIndex = pageSource.indexOf('data-testid="pixal3d-free-trial-callout"');
    const pageNoticeIndex = pageSource.indexOf('data-testid="pixal3d-page-notice"');
    const generatorCardIndex = pageSource.indexOf('data-testid="pixal3d-generator-card"');

    expect(freeTrialIndex).toBeGreaterThan(-1);
    expect(pageNoticeIndex).toBeGreaterThan(-1);
    expect(generatorCardIndex).toBeGreaterThan(-1);
    expect(freeTrialIndex).toBeLessThan(pageNoticeIndex);
    expect(pageNoticeIndex).toBeLessThan(generatorCardIndex);
    expect(freeTrialIndex).toBeLessThan(generatorCardIndex);
    expect(pageSource).toContain('className="mt-4 w-full max-w-[1420px] overflow-hidden rounded-2xl border border-white/10');
    expect(pageSource).toContain('data-testid="pixal3d-generator-card" className="mt-4');
    expect(pageSource).toContain('className="mb-2 text-center"');
    expect(pageSource).toContain("pixal3d-trial-pulse");
  });

  it("uses a restrained periodic pulse on the free trial button", () => {
    expect(globalCssSource).toContain("@keyframes pixal3d-trial-pulse");
    expect(globalCssSource).toContain("animation: pixal3d-trial-pulse 1s ease-in-out infinite;");
    expect(globalCssSource).toContain(".pixal3d-trial-pulse:not(:disabled)");
    expect(globalCssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the generator surface light while de-emphasizing settings", () => {
    expect(pageSource).toContain('data-testid="pixal3d-generator-card" className="mt-4 w-full max-w-[1420px] rounded-2xl border border-white/10');
    expect(pageSource).toContain("lg:grid-cols-[minmax(0,1.35fr)_minmax(440px,0.65fr)]");
    expect(pageSource).toContain("min-h-[320px]");
    expect(pageSource).toContain("lg:min-h-[248px]");
    expect(pageSource).toContain("px-4 py-8");
    expect(pageSource).toContain("border-white/10 bg-[#09142d]/58 hover:border-[#48bdff]/45");
    expect(pageSource).toContain('className="mt-4 rounded-xl bg-white/[0.025] px-3 py-3"');
    expect(pageSource).toContain("xl:grid-cols-[minmax(720px,1fr)_minmax(320px,440px)]");
    expect(pageSource).toContain('useState<"resolution" | "textureSize" | null>(null)');
    expect(pageSource).toContain("flex h-10 w-full items-center justify-between rounded-full border border-white/10 bg-[#0d1730]/78 pl-4 pr-5");
    expect(pageSource).toContain('role="listbox"');
    expect(pageSource).toContain("rounded-2xl border border-[#48bdff]/25 bg-[#0b1530]/98");
    expect(pageSource).toContain("text-xs font-bold uppercase tracking-normal text-[#8996b2]");
    expect(pageSource).toContain("sm:flex-row sm:items-start xl:justify-end xl:pt-6");
    expect(pageSource).toContain("xl:max-w-[420px]");
    expect(pageSource).toContain("hover:-translate-y-0.5 hover:brightness-110");
  });

  it("offers 8192 as a display option while sending 4096 to the API", () => {
    expect(pageSource).toContain("type ApiTextureSizeOption = 1024 | 2048 | 4096;");
    expect(pageSource).toContain("type TextureSizeOption = ApiTextureSizeOption | 8192;");
    expect(pageSource).toContain("const TEXTURE_SIZE_OPTIONS: TextureSizeOption[] = [1024, 2048, 4096, 8192];");
    expect(pageSource).toContain("8192: 4096");
    expect(pageSource).toContain("function getMaxSelectableTextureSize(entitlement: ThreeDPlanEntitlement | null): TextureSizeOption");
    expect(pageSource).toContain("if (!entitlement) {\n    return 8192;");
    expect(pageSource).toContain('entitlement.tier === "creator" || entitlement.tier === "pro"');
    expect(pageSource).toContain("const apiTextureSize = API_TEXTURE_SIZE_BY_UI_TEXTURE_SIZE[settings.textureSize];");
    expect(pageSource).toContain("textureSize: apiTextureSize");
    expect(pageSource).toContain("const isDisabled = option > maxSelectableTextureSize;");
    expect(pageSource).not.toContain("option > planEntitlement.maxTextureSize");
  });

  it("shows the retro computer example result early in the generator card", () => {
    const generatorCardIndex = pageSource.indexOf('data-testid="pixal3d-generator-card"');
    const exampleResultIndex = pageSource.indexOf('data-testid="pixal3d-example-result"');
    const settingsIndex = pageSource.indexOf('data-testid="pixal3d-resolution-select"');

    expect(pageSource).toContain('item.id === "keyboard"');
    expect(pageSource).toContain('name: "Retro computer"');
    expect(pageSource).toContain('transparentSrc: "/samples/retro-computer-transparent.png"');
    expect(pageSource).not.toContain("{DEFAULT_EXAMPLE_RESULT.name}");
    expect(pageSource).toContain('modelUrl: "/samples/keyboard-preview.glb"');
    expect(pageSource).toContain('rel="preconnect" href={PIXAL3D_REFERENCE_ASSET_BASE}');
    expect(pageSource).toContain('rel="preload"');
    expect(pageSource).toContain("href={DEFAULT_EXAMPLE_RESULT.modelUrl}");
    expect(pageSource).toContain('type="model/gltf-binary"');
    expect(pageSource).not.toContain("poster: DEFAULT_EXAMPLE_RESULT.transparentSrc ?? DEFAULT_EXAMPLE_RESULT.src");
    expect(pageSource).not.toContain("reveal: \"auto\"");
    expect(pageSource).toContain("object-contain");
    expect(pageSource).toContain('className="aspect-square overflow-visible"');
    expect(pageSource).toContain('className="aspect-[1.08] overflow-visible"');
    expect(pageSource).toContain('data-testid="pixal3d-example-result"');
    expect(pageSource).toContain("relative flex min-h-[320px] flex-col overflow-hidden");
    expect(pageSource).toContain("grid flex-1 grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1fr)] items-center gap-3 py-4");
    expect(pageSource).toContain('data-testid": "pixal3d-example-model-viewer"');
    expect(pageSource).toContain('"auto-rotate": true');
    expect(pageSource).toContain('className: "block h-full w-full"');
    expect(pageSource).toContain("rotate-45 border-r-2 border-t-2");
    expect(pageSource).not.toContain("exampleInputLabel");
    expect(pageSource).not.toContain("exampleUseButton");
    expect(pageSource).not.toContain('data-testid="pixal3d-example-preview-button"');
    expect(pageSource).not.toContain("setIsExamplePreviewOpen(true)");
    expect(exampleResultIndex).toBeGreaterThan(generatorCardIndex);
    expect(exampleResultIndex).toBeLessThan(settingsIndex);
  });
});
