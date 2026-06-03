import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../../../libs/i18n/locales/en";

describe("Next home SEO copy", () => {
  const pageSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );
  const layoutSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "layout.tsx"),
    "utf8",
  );

  it("uses the agreed search result metadata", () => {
    expect(en.home.metadata.title).toBe("Pixal3D - AI Image to 3D Generator");
    expect(en.home.metadata.description).toBe(
      "Create AI 3D models from images with Pixal3D. Powered by the MIT-licensed Pixal3D project from TencentARC, with GLB export.",
    );
  });

  it("uses concise hero copy with the TencentARC trust line", () => {
    expect(en.pixal3d.generator.heroTitle).toBe("Turn Any Image into a Faithful 3D Model");
    expect(en.pixal3d.generator.subtitle).toBe("Free to try, no sign-in needed");
    expect(en.pixal3d.generator.trustLine).toBe(
      "Powered by the MIT-licensed Pixal3D project from TencentARC.",
    );
    expect(pageSource).toContain("t.pixal3d.generator.trustLine");
  });

  it("emits WebApplication structured data for the Next route", () => {
    expect(layoutSource).toContain('type="application/ld+json"');
    expect(layoutSource).toContain('"@type": "WebApplication"');
    expect(layoutSource).toContain('"isBasedOn"');
    expect(layoutSource).toContain("https://github.com/TencentARC/Pixal3D");
  });
});
