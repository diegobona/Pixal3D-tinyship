import { beforeEach, describe, expect, test, vi } from "vitest";

const getSessionMock = vi.fn();

describe("Next auth middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();

    vi.doMock("next/server", () => ({
      NextResponse: {
        redirect(url: URL | string) {
          return Response.redirect(url, 307);
        },
      },
    }));

    vi.doMock("@libs/auth", () => ({
      auth: {
        api: {
          getSession: getSessionMock,
        },
      },
    }));

    vi.doMock("@config", () => ({
      config: {
        app: {
          i18n: {
            defaultLocale: "en",
          },
        },
      },
    }));

    vi.doMock("@libs/i18n", () => ({
      locales: ["en", "zh-CN"],
      translations: {
        en: {},
        "zh-CN": {},
      },
    }));
  });

  test("redirects unauthenticated my-assets requests to signin", async () => {
    getSessionMock.mockResolvedValue(null);

    const { authMiddleware } = await import("../../../apps/next-app/middlewares/authMiddleware");
    const response = await authMiddleware({
      headers: new Headers(),
      nextUrl: { pathname: "/my-assets" },
      url: "http://localhost/my-assets",
    } as any);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/signin");
  });

  test("allows authenticated my-assets requests", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "user_123" } });

    const { authMiddleware } = await import("../../../apps/next-app/middlewares/authMiddleware");
    const response = await authMiddleware({
      headers: new Headers(),
      nextUrl: { pathname: "/my-assets" },
      url: "http://localhost/my-assets",
    } as any);

    expect(response).toBeUndefined();
  });
});
