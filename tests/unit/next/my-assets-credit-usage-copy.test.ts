import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(__dirname, "../../..");
const pricingHint = "Per-generation credit usage will decrease as provider pricing drops.";

function readWorkspaceFile(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("My Assets credit usage copy", () => {
  test("moves provider-pricing hint from dashboard to my-assets history", () => {
    const dashboardSource = readWorkspaceFile("apps/next-app/app/[lang]/(root)/dashboard/page.tsx");
    const myAssetsSource = readWorkspaceFile("apps/next-app/app/[lang]/(root)/my-assets/page.tsx");
    const gridSource = readWorkspaceFile("apps/next-app/components/my-assets-grid.tsx");

    expect(dashboardSource).not.toContain("pricingHint");
    expect(myAssetsSource).toContain("pricingHint");
    expect(gridSource).toContain("pricingHint");
    expect(readWorkspaceFile("libs/i18n/locales/en.ts")).toContain(pricingHint);
  });

  test("shows each historical task's consumed credits from the generation record", () => {
    const myAssetsSource = readWorkspaceFile("apps/next-app/app/[lang]/(root)/my-assets/page.tsx");
    const gridSource = readWorkspaceFile("apps/next-app/components/my-assets-grid.tsx");

    expect(myAssetsSource).toContain("creditsConsumed: record.creditCost");
    expect(gridSource).toContain("creditsConsumed");
    expect(gridSource).toContain("my-assets-credits-used");
  });
});
