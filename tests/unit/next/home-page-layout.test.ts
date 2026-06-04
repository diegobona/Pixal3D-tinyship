import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next home page layout", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
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
  });

  it("keeps the generator surface light while de-emphasizing settings", () => {
    expect(pageSource).toContain('data-testid="pixal3d-generator-card" className="mt-4 w-full max-w-[1420px] rounded-2xl border border-white/10');
    expect(pageSource).toContain("min-h-[232px]");
    expect(pageSource).toContain("border-white/10 bg-[#09142d]/58 hover:border-[#48bdff]/45");
    expect(pageSource).toContain('className="mt-4 rounded-xl bg-white/[0.025] px-3 py-3"');
    expect(pageSource).toContain("h-10 rounded-full border border-white/10 bg-[#0d1730]/78");
    expect(pageSource).toContain("text-xs font-bold uppercase tracking-normal text-[#8996b2]");
    expect(pageSource).toContain("hover:-translate-y-0.5 hover:brightness-110");
  });
});
