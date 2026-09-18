import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Removed AnyPoses global footer", () => {
  const footerPath = join(process.cwd(), "apps", "next-app", "components", "global-footer.tsx");
  const layoutSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "layout.tsx"),
    "utf8",
  );

  it("does not render or retain the obsolete AnyPoses footer", () => {
    expect(existsSync(footerPath)).toBe(false);
    expect(layoutSource).not.toContain('import GlobalFooter from "@/components/global-footer";');
    expect(layoutSource).not.toContain("<GlobalFooter />");
  });
});
