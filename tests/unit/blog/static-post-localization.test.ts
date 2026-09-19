import { describe, expect, it } from "vitest";
import { getStaticBlogPosts } from "../../../libs/blog/static-posts";

describe("static blog localization", () => {
  it("ships a complete Simplified Chinese version of every static article", () => {
    const english = getStaticBlogPosts("en");
    const chinese = getStaticBlogPosts("zh-CN");

    expect(chinese.map((post) => post.slug)).toEqual(english.map((post) => post.slug));
    expect(chinese).toHaveLength(6);

    for (const post of chinese) {
      expect(post.title).toMatch(/[\u3400-\u9fff]/);
      expect(post.excerpt).toMatch(/[\u3400-\u9fff]/);
      expect(JSON.stringify(post.sections)).toMatch(/[\u3400-\u9fff]/);
    }
  });
});
