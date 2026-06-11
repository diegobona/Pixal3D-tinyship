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

  it("hides the credits pill when monetization surfaces are disabled", () => {
    expect(headerSource).toContain("if (!PIXAL3D_SHOW_MONETIZATION_SURFACES)");
    expect(headerSource).toContain("{PIXAL3D_SHOW_MONETIZATION_SURFACES ? (");
    expect(headerSource).toContain("<CreditsIcon />");
  });

  it("hides the language switcher behind a visibility flag", () => {
    const visibilitySource = readFileSync(
      join(process.cwd(), "apps", "next-app", "lib", "pixal3d-surface-visibility.ts"),
      "utf8",
    );

    expect(visibilitySource).toContain("export const PIXAL3D_SHOW_LANGUAGE_SWITCHER = false;");
    expect(headerSource).toContain("{PIXAL3D_SHOW_LANGUAGE_SWITCHER ? (");
    expect(headerSource).toContain("<LocaleIcon />");
  });
});
