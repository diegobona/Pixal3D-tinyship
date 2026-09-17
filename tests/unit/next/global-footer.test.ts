import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../../../libs/i18n/locales/en";
import { zhCN } from "../../../libs/i18n/locales/zh-CN";

describe("Next global footer", () => {
  const footerPath = join(process.cwd(), "apps", "next-app", "components", "global-footer.tsx");
  const layoutSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "layout.tsx"),
    "utf8",
  );

  it("links every public root page to the AnyPoses scene builder", () => {
    expect(existsSync(footerPath)).toBe(true);
    if (!existsSync(footerPath)) return;

    const footerSource = readFileSync(footerPath, "utf8");

    expect(layoutSource).toContain('import GlobalFooter from "@/components/global-footer";');
    expect(layoutSource).toContain("<GlobalFooter />");
    expect(footerSource).toContain('href="https://anyposes.com"');
    expect(footerSource).toContain('target="_blank"');
    expect(footerSource).toContain('rel="noreferrer noopener"');
    expect(footerSource).toContain("t.siteFooter.anyposesTip");
  });

  it("provides concise English and Chinese footer copy", () => {
    expect(en.siteFooter.anyposesTip).toBe(
      "No reference image? Create a custom 3D pose and scene on AnyPoses.",
    );
    expect(zhCN.siteFooter.anyposesTip).toBe(
      "没有参考图？去 AnyPoses 自由摆姿并搭建 3D 场景。",
    );
  });
});
