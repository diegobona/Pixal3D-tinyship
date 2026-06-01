import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("home generation progress order", () => {
  const source = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );

  it("renders generation progress before the free trial band", () => {
    const progressIndex = source.indexOf('data-testid="pixal3d-generation-progress"');
    const freeTrialIndex = source.indexOf('data-testid="pixal3d-free-trial-button"');

    expect(progressIndex).toBeGreaterThan(-1);
    expect(freeTrialIndex).toBeGreaterThan(-1);
    expect(progressIndex).toBeLessThan(freeTrialIndex);
  });
});
