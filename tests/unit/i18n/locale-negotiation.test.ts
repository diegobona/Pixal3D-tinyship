import { describe, expect, it } from "vitest";

import {
  parseAcceptLanguage,
  resolvePreferredLocale,
} from "../../../libs/i18n/locale-negotiation";

describe("locale negotiation", () => {
  it("lets a valid manual cookie override browser and country signals", () => {
    expect(resolvePreferredLocale({
      cookieLocale: "en",
      acceptLanguage: "zh-CN,zh;q=0.9",
      countryCode: "CN",
    })).toBe("en");
  });

  it("ignores invalid manual cookie values", () => {
    expect(resolvePreferredLocale({
      cookieLocale: "zh",
      acceptLanguage: "en-US,en;q=0.9",
      countryCode: "CN",
    })).toBe("en");
  });

  it("honors weighted language order instead of raw header order", () => {
    expect(parseAcceptLanguage("en-US;q=0.4, zh-CN;q=0.9")).toBe("zh-CN");
    expect(parseAcceptLanguage("zh-CN;q=0.4, en-US;q=0.9")).toBe("en");
  });

  it("excludes q=0 and malformed quality values", () => {
    expect(parseAcceptLanguage("zh-CN;q=0, en-US;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("zh-CN;q=wat, en-US;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("zh-CN;q=0.8junk, en-US;q=0.7")).toBe("en");
    expect(parseAcceptLanguage("zh-CN;q=1.1, en-US;q=0.7")).toBe("en");
  });

  it("preserves header order when supported languages have equal weights", () => {
    expect(parseAcceptLanguage("zh-CN;q=0.8,en-US;q=0.8")).toBe("zh-CN");
    expect(parseAcceptLanguage("en-US;q=0.8,zh-CN;q=0.8")).toBe("en");
  });

  it("normalizes casing, whitespace, and available Chinese variants", () => {
    expect(parseAcceptLanguage("  ZH-hant ; q=1  ")).toBe("zh-CN");
    expect(parseAcceptLanguage("zh-TW")).toBe("zh-CN");
    expect(parseAcceptLanguage("zh-HK")).toBe("zh-CN");
    expect(parseAcceptLanguage("zh-Hans")).toBe("zh-CN");
  });

  it("uses mainland China only as a fallback for unsupported browser languages", () => {
    expect(resolvePreferredLocale({ acceptLanguage: "fr-FR", countryCode: "CN" })).toBe("zh-CN");
    expect(resolvePreferredLocale({ acceptLanguage: "fr-FR", countryCode: "HK" })).toBe("en");
    expect(resolvePreferredLocale({ acceptLanguage: "fr-FR", countryCode: "US" })).toBe("en");
  });

  it("uses English for wildcard-only, unsupported-only, or absent signals", () => {
    expect(resolvePreferredLocale({ acceptLanguage: "*" })).toBe("en");
    expect(resolvePreferredLocale({ acceptLanguage: "de-DE,fr;q=0.8" })).toBe("en");
    expect(resolvePreferredLocale({})).toBe("en");
  });
});
