import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { en } from "../../../libs/i18n/locales/en";

describe("global header navigation", () => {
  const headerSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "components", "global-header.tsx"),
    "utf8",
  );

  it("shows an explicit Home item before Features", () => {
    expect(en.header.navigation.home).toBe("Home");

    const homeIndex = headerSource.indexOf("t.header.navigation.home");
    const featuresIndex = headerSource.indexOf("t.pixal3d.generator.featuresNav");

    expect(homeIndex).toBeGreaterThan(-1);
    expect(featuresIndex).toBeGreaterThan(-1);
    expect(homeIndex).toBeLessThan(featuresIndex);
    expect(headerSource).toContain("href={homeHref}");
  });

  it("shows the TencentARC source badge beside the brand", () => {
    expect(headerSource).toContain("From TencentARC");
    expect(headerSource).toContain('data-testid="pixal3d-source-badge"');
  });
});
