import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("home credit status refresh", () => {
  const homeSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "page.tsx"),
    "utf8",
  );
  const paymentSuccessSource = readFileSync(
    join(process.cwd(), "apps", "next-app", "app", "[lang]", "(root)", "payment-success", "page.tsx"),
    "utf8",
  );

  it("refreshes the home generator credit status when the page regains attention", () => {
    expect(homeSource).toContain('window.addEventListener("focus", loadCreditStatus)');
    expect(homeSource).toContain('document.addEventListener("visibilitychange", handleVisibilityChange)');
    expect(homeSource).toContain('document.visibilityState === "visible"');
  });

  it("broadcasts a fresh credit status after payment success verification", () => {
    expect(paymentSuccessSource).toContain('dispatchCreditStatusUpdated');
    expect(paymentSuccessSource).toContain('fetch("/api/credits/status", { cache: "no-store" })');
  });
});
