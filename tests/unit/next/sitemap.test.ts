import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next sitemap", () => {
  const sitemapSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "sitemap.ts"),
    "utf8",
  );

  it("publishes only public SEO routes with localized alternates", () => {
    expect(sitemapSource).toContain('sitemapEntry("/", { changeFrequency: "weekly", priority: 1 })');
    expect(sitemapSource).toContain("PIXAL3D_SHOW_MONETIZATION_SURFACES");
    expect(sitemapSource).toContain('sitemapEntry("/pricing", { changeFrequency: "monthly", priority: 0.8 })');
    expect(sitemapSource).toContain('sitemapEntry("/blog", { changeFrequency: "weekly", priority: 0.7 })');
    expect(sitemapSource).toContain('sitemapEntry(`/blog/${post.slug}`');
    expect(sitemapSource).toContain('"zh-CN": absoluteUrl(path, "zh-CN")');
    expect(sitemapSource).not.toContain('sitemapEntry("/dashboard"');
    expect(sitemapSource).not.toContain('sitemapEntry("/my-assets"');
    expect(sitemapSource).not.toContain('sitemapEntry("/signin"');
    expect(sitemapSource).not.toContain('sitemapEntry("/signup"');
  });

  it("keeps sitemap available if database blog lookup fails", () => {
    expect(sitemapSource).toContain("getPublishedDatabaseBlogEntries");
    expect(sitemapSource).toContain("catch (error)");
    expect(sitemapSource).toContain("return [];");
  });
});
