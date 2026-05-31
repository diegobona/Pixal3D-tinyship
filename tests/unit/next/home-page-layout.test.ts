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

  it("keeps the free trial band slightly separated from the generator card", () => {
    expect(pageSource).toContain('<div className="mt-6 w-full max-w-[1420px]');
  });
});
