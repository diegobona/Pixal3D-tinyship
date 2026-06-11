import { beforeEach, describe, expect, test, vi } from "vitest";

const getSessionMock = vi.fn();
const insertValuesMock = vi.fn();
const insertMock = vi.fn();

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/feedback/pain-point", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Next pain point feedback API route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getSessionMock.mockReset();
    insertValuesMock.mockReset();
    insertMock.mockReset();
    insertValuesMock.mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: insertValuesMock });

    vi.doMock("next/server", () => ({
      NextResponse: {
        json(data: unknown, init?: ResponseInit) {
          return Response.json(data, init);
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

    vi.doMock("@libs/database", () => ({
      db: {
        insert: insertMock,
      },
      painPointFeedback: { tableName: "pain_point_feedback" },
    }));
  });

  test("accepts anonymous pain point feedback", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest(
      {
        painPoints: ["too_expensive", "local_setup_complicated"],
        otherText: "I need a cheaper way to test ideas.",
        pageUrl: "https://pixal3d.net/",
      },
      {
        referer: "https://google.com/search?q=pixal3d",
        "user-agent": "Vitest Browser",
      },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith({ tableName: "pain_point_feedback" });
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^pain_/),
      painPoint: "too_expensive",
      selectedPainPoints: ["too_expensive", "local_setup_complicated"],
      otherText: "I need a cheaper way to test ideas.",
      userId: null,
      userEmail: null,
      pageUrl: "https://pixal3d.net/",
      referrer: "https://google.com/search?q=pixal3d",
      userAgent: "Vitest Browser",
    }));
  });

  test("records signed-in user identity from the server session", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "user_123",
        email: "creator@example.com",
      },
    });

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest({
      painPoints: ["local_setup_complicated", "hard_to_find_asset_packs"],
      userEmail: "spoofed@example.com",
    }));

    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      painPoint: "local_setup_complicated",
      selectedPainPoints: ["local_setup_complicated", "hard_to_find_asset_packs"],
      userId: "user_123",
      userEmail: "creator@example.com",
    }));
  });

  test("rejects unsupported pain point values before inserting", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest({
      painPoints: ["too_expensive", "not_a_real_reason"],
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, error: "invalid_feedback" });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  test("rejects empty multi-select submissions before inserting", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest({
      painPoints: [],
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, error: "invalid_feedback" });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});
