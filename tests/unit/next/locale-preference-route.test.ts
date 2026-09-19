import { describe, expect, it } from "vitest";
import { POST } from "../../../apps/next-app/app/api/locale/route";

function postLocale(locale: unknown) {
  return POST(new Request("http://localhost/api/locale", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale }),
  }));
}

describe("POST /api/locale", () => {
  it("stores a long-lived, server-only manual locale preference", async () => {
    const response = await postLocale("zh-CN");
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(cookie).toContain("NEXT_LOCALE=zh-CN");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=31536000");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("rejects unsupported locale values without setting a cookie", async () => {
    const response = await postLocale("fr");

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("supports progressive-enhancement form posts and redirects safely", async () => {
    const body = new URLSearchParams({ locale: "en", returnTo: "/blog?page=2" });
    const response = await POST(new Request("http://localhost/api/locale", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/blog?page=2");
    expect(response.headers.get("set-cookie")).toContain("NEXT_LOCALE=en");
  });

  it("rejects backslash-based and off-origin return destinations", async () => {
    for (const returnTo of ["/\\evil.example", "//evil.example/path", "https://evil.example/path"]) {
      const body = new URLSearchParams({ locale: "en", returnTo });
      const response = await POST(new Request("http://localhost/api/locale", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }));

      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe("/");
    }
  });
});
