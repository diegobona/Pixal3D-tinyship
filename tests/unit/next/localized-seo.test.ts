import { describe, expect, it } from "vitest";
import { localizedSeo } from "../../../apps/next-app/lib/localized-seo";

describe("localized SEO metadata", () => {
  it("uses clean English canonicals and reciprocal language alternates", () => {
    expect(localizedSeo("/blog", "en")).toMatchObject({
      alternates: {
        canonical: "/blog",
        languages: { en: "/blog", "zh-CN": "/zh-CN/blog", "x-default": "/blog" },
      },
      openGraph: { url: "/blog", locale: "en_US", alternateLocale: ["zh_CN"] },
    });
    expect(localizedSeo("/blog", "zh-CN").alternates?.canonical).toBe("/zh-CN/blog");
  });

  it("omits unavailable Chinese alternates and supports private noindex pages", () => {
    const englishOnly = localizedSeo("/blog/database-post", "en", { locales: ["en"] });
    expect(englishOnly.alternates?.languages).toEqual({
      en: "/blog/database-post",
      "x-default": "/blog/database-post",
    });

    expect(localizedSeo("/dashboard", "zh-CN", { indexable: false })).toMatchObject({
      robots: { index: false, follow: false },
    });
    expect(localizedSeo("/dashboard", "zh-CN", { indexable: false }).alternates?.languages).toEqual({});
  });
});
