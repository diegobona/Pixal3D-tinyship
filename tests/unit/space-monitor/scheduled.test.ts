import { afterEach, describe, expect, it, vi } from "vitest";
import { runScheduledJobs } from "../../../scripts/cloudflare-scheduled.mjs";
import { authorizeMonitor, monitorCheckTime } from "../../../libs/space-monitor/auth";

afterEach(() => vi.restoreAllMocks());

describe("monitor operator boundary", () => {
  it("requires the configured secret and accepts header or Bearer credentials", () => {
    const request = (headers: Record<string, string> = {}) => new Request("https://site.test/api/cron", { headers });
    expect(authorizeMonitor(request(), "")).toBe(503);
    expect(authorizeMonitor(request(), "secret")).toBe(401);
    expect(authorizeMonitor(request({ "x-cron-secret": "wrong" }), "secret")).toBe(401);
    expect(authorizeMonitor(request({ "x-cron-secret": "secret" }), "secret")).toBe(200);
    expect(authorizeMonitor(request({ authorization: "Bearer secret" }), "secret")).toBe(200);
  });
  it("anchors the 72h cycle to a recent scheduled time but rejects stale timestamps", () => {
    const now = new Date("2026-10-07T08:00:05Z");
    const request = (value: string) => new Request("https://site.test", { headers: { "x-cron-scheduled-time": value } });
    expect(monitorCheckTime(request(String(+now - 5000)), now).toISOString()).toBe("2026-10-07T08:00:00.000Z");
    expect(monitorCheckTime(request("broken"), now)).toEqual(now);
    expect(monitorCheckTime(request("1"), now)).toEqual(now);
  });
});

describe("deployed scheduled jobs", () => {
  it("preserves credits and dispatches each model independently with the same scheduled anchor", async () => {
    const request = vi.fn(async () => new Response(null, { status: 200 }));
    await runScheduledJobs({ scheduledTime: 123 }, { APP_BASE_URL: "https://site.test", CRON_SECRET: "secret", SPACE_MONITOR_SECRET: "secret" }, request);
    expect(request.mock.calls.map(([url]) => String(url))).toEqual([
      "https://site.test/api/cron/refresh-yearly-credits",
      "https://site.test/api/cron/space-monitor/pixal3d",
      "https://site.test/api/cron/space-monitor/trellis",
      "https://site.test/api/cron/space-monitor/hunyuan3d",
    ]);
    expect(request).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ method: "POST", redirect: "manual", headers: expect.objectContaining({ "x-cron-scheduled-time": "123", "x-cron-secret": "secret" }) }));
  });
  it("lets the other jobs complete and reports scheduler failure when one fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = vi.fn(async (url: URL) => new Response(null, { status: url.pathname.includes("trellis") ? 503 : 200 }));
    await expect(runScheduledJobs({}, { APP_BASE_URL: "https://site.test", CRON_SECRET: "secret", SPACE_MONITOR_SECRET: "secret" }, request)).rejects.toThrow("scheduled jobs failed");
    expect(request).toHaveBeenCalledTimes(4);
  });
  it("does not send a secret without complete HTTPS configuration", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = vi.fn();
    await runScheduledJobs({}, { APP_BASE_URL: "https://site.test" }, request);
    await expect(runScheduledJobs({}, { APP_BASE_URL: "http://site.test", CRON_SECRET: "secret" }, request)).rejects.toThrow("HTTPS");
    expect(request).not.toHaveBeenCalled();
  });
  it("can enable Space monitoring without activating an unconfigured credits job", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const request = vi.fn(async () => new Response(null));
    await runScheduledJobs({}, { APP_BASE_URL: "https://site.test", SPACE_MONITOR_SECRET: "monitor-only" }, request);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.every(([url]) => String(url).includes("/api/cron/space-monitor/"))).toBe(true);
  });
});
