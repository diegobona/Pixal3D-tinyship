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

  test("accepts an anonymous 3D product request", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest(
      {
        otherText: "I need a stylized low-poly train station for a game.",
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
      painPoint: "other",
      selectedPainPoints: [],
      otherText: "I need a stylized low-poly train station for a game.",
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
      otherText: "一套适合移动游戏的中国古建筑模型。",
      userEmail: "spoofed@example.com",
    }));

    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      painPoint: "other",
      selectedPainPoints: [],
      otherText: "一套适合移动游戏的中国古建筑模型。",
      userId: "user_123",
      userEmail: "creator@example.com",
    }));
  });

  test("accepts exactly 3,000 characters", async () => {
    getSessionMock.mockResolvedValue(null);
    const otherText = "模".repeat(3000);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest({
      otherText,
    }));

    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledWith(expect.objectContaining({ otherText }));
  });

  test("rejects more than 3,000 characters before inserting", async () => {
    getSessionMock.mockResolvedValue(null);

    const { POST } = await import("../../../apps/next-app/app/api/feedback/pain-point/route");
    const response = await POST(createRequest({
      otherText: "a".repeat(3001),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, error: "feedback_too_long" });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  test("rejects empty feedback before inserting", async () => {
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
