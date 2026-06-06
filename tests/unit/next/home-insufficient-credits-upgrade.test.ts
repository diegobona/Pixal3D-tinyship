import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("home insufficient credits upgrade shortcut", () => {
  const source = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );

  it("shows an upgrade shortcut beside the insufficient credits hint", () => {
    expect(source).toContain("showGenerateUpgradeShortcut");
    expect(source).toContain("!hasEnoughCredits");
    expect(source).toContain("isAuthenticated");
    expect(source).toContain("hasPaidSubscription");
    expect(source).toContain('window.location.href = localizedPath("/pricing");');
    expect(source).toContain("t.pixal3d.generator.upgradeToGenerateButton");
  });

  it("shows a subscribe shortcut for signed-in users without a paid subscription", () => {
    expect(source).toContain("showGenerateSubscribeShortcut");
    expect(source).toContain("!hasPaidSubscription");
    expect(source).toContain("canUseGenerateButtonAsPricingShortcut");
    expect(source).toContain("t.pixal3d.generator.subscribeToGenerateButton");
    expect(source).toContain("t.pixal3d.generator.errors.generateDisabledFreeTrialAbove");
  });
});
