import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next auth page branding", () => {
  const authLayoutSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(auth)", "layout.tsx"),
    "utf8",
  );
  const signinSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(auth)", "signin", "page.tsx"),
    "utf8",
  );
  const signupSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(auth)", "signup", "page.tsx"),
    "utf8",
  );
  const socialAuthSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "components", "social-auth.tsx"),
    "utf8",
  );
  const globalCssSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "globals.css"),
    "utf8",
  );

  it("uses the Pixal3D dark blue brand surface instead of the generic muted background", () => {
    expect(authLayoutSource).toContain('data-testid="pixal3d-auth-shell"');
    expect(authLayoutSource).toContain("bg-[#06142d]");
    expect(authLayoutSource).toContain("radial-gradient(circle_at_50%_0%,rgba(72,189,255,0.18)");
    expect(authLayoutSource).not.toContain("bg-muted");
  });

  it("brands sign-in and sign-up forms with dark inputs and the blue-green primary action", () => {
    for (const source of [signinSource, signupSource]) {
      expect(source).toContain("bg-[linear-gradient(180deg,rgba(11,20,43,0.88),rgba(7,13,32,0.96))]");
      expect(source).toContain("bg-[#0d1730]/82");
      expect(source).toContain("focus-visible:border-[#48bdff]");
      expect(source).toContain("from-[#48bdff] to-[#00f08a]");
      expect(source).toContain("text-[#77e8ff]");
    }
  });

  it("keeps browser autofill from repainting auth inputs light blue", () => {
    expect(globalCssSource).toContain('[data-testid="pixal3d-auth-shell"] input:-webkit-autofill');
    expect(globalCssSource).toContain("-webkit-box-shadow: 0 0 0 1000px #0d1730 inset;");
    expect(globalCssSource).toContain("-webkit-text-fill-color: #ffffff;");
  });

  it("does not trigger the Next dev console overlay for social auth errors", () => {
    expect(socialAuthSource).toContain("buttonClassName");
    expect(socialAuthSource).not.toContain("console.error");
  });
});
