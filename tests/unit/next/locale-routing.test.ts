import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "../../../apps/next-app/middleware";
import { config as appConfig } from "../../../config";

function request(
  path: string,
  options: { acceptLanguage?: string; country?: string; cookie?: string } = {},
) {
  const headers = new Headers();
  if (options.acceptLanguage) headers.set("accept-language", options.acceptLanguage);
  if (options.country) headers.set("cf-ipcountry", options.country);
  if (options.cookie) headers.set("cookie", options.cookie);
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("Next locale routing", () => {
  it("redirects a fresh Chinese browser while preserving path and query", () => {
    const response = middleware(request("/?source=campaign", { acceptLanguage: "zh-CN,zh;q=0.9" }));

    expect(response.headers.get("location")).toBe("http://localhost/zh-CN?source=campaign");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toContain("Accept-Language");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rewrites an English browser to the internal English route", () => {
    const response = middleware(request("/blog?page=2", { acceptLanguage: "en-US,en;q=0.9" }));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/en/blog?page=2");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("lets the manual cookie override browser and country signals", () => {
    const response = middleware(request("/", {
      acceptLanguage: "zh-CN",
      country: "CN",
      cookie: "NEXT_LOCALE=en",
    }));

    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost/en");
  });

  it("uses the country header only when browser language is unsupported", () => {
    const chineseFallback = middleware(request("/", { acceptLanguage: "fr-FR", country: "CN" }));
    const explicitEnglish = middleware(request("/", { acceptLanguage: "en-US", country: "CN" }));

    expect(chineseFallback.headers.get("location")).toBe("http://localhost/zh-CN");
    expect(explicitEnglish.headers.get("x-middleware-rewrite")).toBe("http://localhost/en");
  });

  it("keeps explicit Chinese URLs and cleans explicit English prefixes without setting cookies", () => {
    const chinese = middleware(request("/zh-CN/blog?ref=direct", { acceptLanguage: "en-US" }));
    const english = middleware(request("/en/blog?ref=direct", { acceptLanguage: "zh-CN" }));

    expect(chinese.headers.get("location")).toBeNull();
    expect(chinese.headers.get("set-cookie")).toBeNull();
    expect(english.headers.get("location")).toBe("http://localhost/blog?ref=direct");
    expect(english.headers.get("set-cookie")).toBeNull();
  });

  it("localizes hidden-page redirects without a second redirect hop", () => {
    const response = middleware(request("/dashboard", { acceptLanguage: "zh-CN" }));
    expect(response.headers.get("location")).toBe("http://localhost/zh-CN");
  });

  it("uses middleware as the only locale-routing authority", () => {
    const nextConfigSource = readFileSync(
      join(process.cwd(), "apps", "next-app", "next.config.ts"),
      "utf8",
    );

    expect(nextConfigSource).not.toContain("async redirects()");
    expect(nextConfigSource).not.toContain("async rewrites()");
    expect(appConfig.app.i18n.autoDetect).toBe(true);
  });
});
