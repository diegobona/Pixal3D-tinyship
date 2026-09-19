import { describe, expect, it } from "vitest";
import {
  getAvailableBlogLocales,
  localizeDatabaseBlogPost,
} from "../../../libs/blog/localized-blog";

const post = {
  slug: "database-post",
  title: "English title",
  excerpt: "English excerpt",
  content: "English content",
  metadata: {
    locales: {
      "zh-CN": {
        title: "中文标题",
        excerpt: "中文摘要",
        content: "中文正文",
      },
    },
  },
};

describe("database blog localization", () => {
  it("uses base columns for English and typed metadata for Chinese", () => {
    expect(localizeDatabaseBlogPost(post, "en")).toMatchObject({ title: "English title" });
    expect(localizeDatabaseBlogPost(post, "zh-CN")).toMatchObject({
      title: "中文标题",
      excerpt: "中文摘要",
      content: "中文正文",
    });
    expect(getAvailableBlogLocales(post.metadata)).toEqual(["en", "zh-CN"]);
  });

  it("omits Chinese posts when translation metadata is absent or malformed", () => {
    expect(localizeDatabaseBlogPost({ ...post, metadata: null }, "zh-CN")).toBeNull();
    expect(localizeDatabaseBlogPost({
      ...post,
      metadata: { locales: { "zh-CN": { title: "只有标题" } } },
    }, "zh-CN")).toBeNull();
    expect(getAvailableBlogLocales(null)).toEqual(["en"]);
  });

  it("accepts translations that omit the optional excerpt", () => {
    const localized = localizeDatabaseBlogPost({
      ...post,
      metadata: {
        locales: {
          "zh-CN": {
            title: "中文标题",
            content: "中文正文",
          },
        },
      },
    }, "zh-CN");

    expect(localized).toMatchObject({
      title: "中文标题",
      excerpt: null,
      content: "中文正文",
    });
  });
});
