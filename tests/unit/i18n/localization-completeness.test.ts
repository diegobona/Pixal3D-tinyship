import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../../../libs/i18n/locales/en";
import { zhCN } from "../../../libs/i18n/locales/zh-CN";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => leafPaths(entry, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      leafPaths(entry, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [prefix];
}

describe("Simplified Chinese dictionary", () => {
  it("is standalone and has the same complete shape as English", () => {
    const source = readFileSync(
      resolve(process.cwd(), "libs/i18n/locales/zh-CN.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/import\s*\{\s*en\s*\}/);
    expect(source).not.toContain("...en");
    expect(leafPaths(zhCN).sort()).toEqual(leafPaths(en).sort());
  });

  it("localizes representative copy across every public product area", () => {
    expect(zhCN.common.loading).not.toBe(en.common.loading);
    expect(zhCN.header.navigation.home).not.toBe(en.header.navigation.home);
    expect(zhCN.pixal3d.generator.heroTitle).not.toBe(en.pixal3d.generator.heroTitle);
    expect(zhCN.pixal3d.advantages.title).not.toBe(en.pixal3d.advantages.title);
    expect(zhCN.auth.signin.welcomeBack).not.toBe(en.auth.signin.welcomeBack);
    expect(zhCN.pricing.contactPlan.description).not.toBe(en.pricing.contactPlan.description);
    expect(zhCN.payment.result.success.title).not.toBe(en.payment.result.success.title);
    expect(zhCN.blog.title).not.toBe(en.blog.title);
    expect(zhCN.dashboard.title).not.toBe(en.dashboard.title);
    expect(zhCN.myAssets.title).not.toBe(en.myAssets.title);
  });
});
