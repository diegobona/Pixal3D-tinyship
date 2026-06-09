import { beforeEach, describe, expect, test, vi } from "vitest";

function createRequest(pathname: string, cookieNames: string[] = []) {
  const url = new URL(`http://localhost${pathname}`);
  return {
    headers: new Headers(cookieNames.length ? { cookie: cookieNames.map((name) => `${name}=value`).join("; ") } : undefined),
    cookies: {
      getAll: () => cookieNames.map((name) => ({ name, value: "value" })),
    },
    nextUrl: {
      pathname,
      clone() {
        return new URL(url);
      },
    },
    url: url.toString(),
  };
}

describe("Next app middleware entry", () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock("next/server", () => ({
      NextResponse: {
        redirect(url: URL | string) {
          return Response.redirect(url, 307);
        },
        rewrite(url: URL | string) {
          return new Response(null, {
            status: 200,
            headers: { "x-middleware-rewrite": String(url) },
          });
        },
        next() {
          return new Response(null, { status: 200 });
        },
      },
    }));

  });

  test("redirects hidden library pages before auth checks", async () => {
    vi.doMock("../../../apps/next-app/middlewares/authMiddleware", () => {
      throw new Error("proxy must not import Node auth middleware");
    });

    const { middleware } = await import("../../../apps/next-app/middleware");
    const response = middleware(createRequest("/my-assets") as any);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  test("keeps hidden library pages hidden even with a session cookie", async () => {
    const { middleware } = await import("../../../apps/next-app/middleware");
    const response = middleware(createRequest("/my-assets", ["better-auth.session_token"]) as any);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });

  test("keeps localized hidden page redirects on localized library pages", async () => {
    const { middleware } = await import("../../../apps/next-app/middleware");
    const response = middleware(createRequest("/zh-CN/my-assets") as any);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/zh-CN/");
  });

  test("redirects hidden pricing pages to home", async () => {
    const { middleware } = await import("../../../apps/next-app/middleware");
    const response = middleware(createRequest("/en/pricing") as any);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/");
  });
});
