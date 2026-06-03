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

  it("keeps FAQ copy focused on trust and GLB export without adding extra entries", () => {
    expect(Object.keys(en.pixal3d.faq.items)).toHaveLength(4);
    expect(en.pixal3d.faq.items.generator.answer).toBe(
      "Pixal3D is an AI image-to-3D generator for creating faithful 3D models from reference images. It is powered by the MIT-licensed Pixal3D project from TencentARC.",
    );
    expect(en.pixal3d.faq.items.oneImage.answer).toBe(
      "Yes. Upload a clear single-object image and Pixal3D can generate a GLB 3D model online.",
    );
    expect(en.pixal3d.faq.items.bestImages.answer).toBe(
      "Single-object images with a clean background, strong silhouette, and visible shape details usually work best.",
    );
    expect(en.pixal3d.faq.items.formats.question).toBe("Can I export the result as a GLB file?");
    expect(en.pixal3d.faq.items.formats.answer).toBe(
      "Yes. Pixal3D exports generated 3D models as GLB files for preview, download, and downstream 3D workflows.",
    );
  });
});
