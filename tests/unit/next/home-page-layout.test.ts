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
    expect(pageSource).toContain('className="mt-6 w-full max-w-[1420px] overflow-hidden rounded-lg');
  });
});
