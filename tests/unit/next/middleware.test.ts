import { beforeEach, describe, expect, test, vi } from "vitest";

const authMiddlewareMock = vi.fn();
const localeMiddlewareMock = vi.fn();

describe("Next app proxy entry", () => {
  beforeEach(() => {
    vi.resetModules();
    authMiddlewareMock.mockReset();
    localeMiddlewareMock.mockReset();

    vi.doMock("next/server", () => ({
      NextResponse: {
        next() {
          return new Response(null, { status: 200 });
        },
      },
    }));

    vi.doMock("../../../apps/next-app/middlewares/authMiddleware", () => ({
      authMiddleware: authMiddlewareMock,
    }));

    vi.doMock("../../../apps/next-app/middlewares/localeMiddleware", () => ({
      localeMiddleware: localeMiddlewareMock,
    }));
  });

  test("runs auth middleware before locale middleware", async () => {
    authMiddlewareMock.mockResolvedValue(undefined);
    localeMiddlewareMock.mockReturnValue(undefined);

    const { proxy } = await import("../../../apps/next-app/proxy");
    const response = await proxy({
      headers: new Headers(),
      nextUrl: { pathname: "/my-assets" },
      url: "http://localhost/my-assets",
    } as any);

    expect(response.status).toBe(200);
    expect(authMiddlewareMock).toHaveBeenCalledOnce();
    expect(localeMiddlewareMock).toHaveBeenCalledOnce();
    expect(authMiddlewareMock.mock.invocationCallOrder[0]).toBeLessThan(
      localeMiddlewareMock.mock.invocationCallOrder[0]
    );
  });

  test("returns auth middleware response without running locale middleware", async () => {
    const redirectResponse = new Response(null, { status: 307 });
    authMiddlewareMock.mockResolvedValue(redirectResponse);

    const { proxy } = await import("../../../apps/next-app/proxy");
    const response = await proxy({
      headers: new Headers(),
      nextUrl: { pathname: "/my-assets" },
      url: "http://localhost/my-assets",
    } as any);

    expect(response).toBe(redirectResponse);
    expect(localeMiddlewareMock).not.toHaveBeenCalled();
  });
});
