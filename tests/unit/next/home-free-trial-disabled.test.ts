import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("home free trial exhaustion", () => {
  const source = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );

  it("disables the free trial button after the API reports the limit is reached", () => {
    expect(source).toContain("isHfTrialLimitReached");
    expect(source).toContain("setIsHfTrialLimitReached(true)");
    expect(source).toContain("disabled={isOpeningHfTrial || isHfTrialLimitReached}");
  });
});
