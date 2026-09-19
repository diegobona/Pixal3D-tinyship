import { describe, expect, it } from "vitest";
import { getLocalePath, stripLocalePrefix } from "../../../apps/next-app/lib/locale-preference";

describe("locale preference paths", () => {
  it("does not trim ordinary English path segments that begin with en", () => {
    expect(stripLocalePrefix("/blog/engineering", "en")).toBe("/blog/engineering");
    expect(getLocalePath("/blog/engineering", "en", "zh-CN")).toBe("/zh-CN/blog/engineering");
  });

  it("only removes an exact leading non-default locale segment", () => {
    expect(stripLocalePrefix("/zh-CN/blog/engineering", "zh-CN")).toBe("/blog/engineering");
    expect(stripLocalePrefix("/zh-CN", "zh-CN")).toBe("/");
    expect(stripLocalePrefix("/zh-CNish", "zh-CN")).toBe("/zh-CNish");
  });
});
