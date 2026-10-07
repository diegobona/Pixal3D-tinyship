import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSpaceMonitor, type MonitorDependencies } from "../../../libs/space-monitor/engine";
import { SPACE_DEFAULT_TARGETS } from "../../../config/space-workspaces";
import type { MonitorState } from "../../../libs/space-monitor/store";

const now = new Date("2026-10-07T08:00:00Z");
const active = SPACE_DEFAULT_TARGETS.pixal3d;
const fallback = { spaceId: "TencentARC/Pixal3D", url: "https://tencentarc-pixal3d.hf.space" };
let deps: MonitorDependencies;
let state: MonitorState;

beforeEach(() => {
  state = { modelId: "pixal3d", activeTarget: active, previousTarget: null, lastCheckedAt: null, nextCheckAt: now, lastResult: null, history: [], leaseToken: "lease", leaseUntil: new Date(+now + 600_000), createdAt: now, updatedAt: now };
  deps = {
    claim: vi.fn(async () => ({ token: "lease", state })),
    complete: vi.fn(async () => true),
    release: vi.fn(async () => true),
    probe: vi.fn(async () => ({ status: "healthy", reason: "frontend_ready", target: active })),
    discover: vi.fn(async () => ({ target: fallback, reason: "verified_same_model" })),
    wait: vi.fn(async () => {}),
  };
});

describe("Space monitoring policy", () => {
  it("does no provider work for not-due or concurrent jobs", async () => {
    vi.mocked(deps.claim).mockResolvedValue(null);
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("skipped");
    expect(deps.probe).not.toHaveBeenCalled();
    expect(deps.discover).not.toHaveBeenCalled();
  });
  it.each(["transient", "unknown"] as const)("keeps the active destination for %s states", async (status) => {
    vi.mocked(deps.probe).mockResolvedValue({ status, reason: "building_or_quota_or_unknown" });
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("deferred");
    expect(deps.discover).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledWith("pixal3d", "lease", expect.objectContaining({ activeTarget: active, previousTarget: null, now }));
  });
  it("confirms hard failure before discovering and publishing a replacement", async () => {
    vi.mocked(deps.probe).mockResolvedValue({ status: "unavailable", reason: "runtime_error" });
    expect(await createSpaceMonitor(deps)("pixal3d", now)).toMatchObject({ outcome: "switched", from: active.spaceId, to: fallback.spaceId });
    expect(deps.probe).toHaveBeenCalledTimes(2);
    expect(deps.wait).toHaveBeenCalledWith(2000);
    expect(deps.complete).toHaveBeenCalledWith("pixal3d", "lease", expect.objectContaining({ activeTarget: fallback, previousTarget: active }));
    expect(deps.release).not.toHaveBeenCalled();
  });
  it("does not switch when the confirming probe recovers", async () => {
    vi.mocked(deps.probe).mockResolvedValueOnce({ status: "unavailable", reason: "http_503" });
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("healthy");
    expect(deps.discover).not.toHaveBeenCalled();
  });
  it("keeps the previous destination if no exact candidate qualifies", async () => {
    vi.mocked(deps.probe).mockResolvedValue({ status: "unavailable", reason: "not_found" });
    vi.mocked(deps.discover).mockResolvedValue({ target: null, reason: "no_verified_replacement" });
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("unresolved");
    expect(deps.complete).toHaveBeenCalledWith("pixal3d", "lease", expect.objectContaining({ activeTarget: active, previousTarget: null }));
  });
  it("rejects a candidate for another model or an arbitrary host", async () => {
    vi.mocked(deps.probe).mockResolvedValue({ status: "unavailable", reason: "not_found" });
    vi.mocked(deps.discover).mockResolvedValue({ target: { ...fallback, url: "https://attacker.invalid" }, reason: "bad_candidate" });
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("unresolved");
  });
  it("revalidates rollback and records the swapped previous target", async () => {
    state.previousTarget = fallback;
    vi.mocked(deps.probe).mockResolvedValue({ status: "healthy", reason: "frontend_ready", target: fallback });
    expect((await createSpaceMonitor(deps)("pixal3d", now, "rollback")).outcome).toBe("rolled_back");
    expect(deps.claim).toHaveBeenCalledWith("pixal3d", active, now, true);
    expect(deps.discover).not.toHaveBeenCalled();
    expect(deps.complete).toHaveBeenCalledWith("pixal3d", "lease", expect.objectContaining({ activeTarget: fallback, previousTarget: active }));
  });
  it("rejects an unhealthy rollback without losing the active target", async () => {
    state.previousTarget = fallback;
    vi.mocked(deps.probe).mockResolvedValue({ status: "unavailable", reason: "runtime_error" });
    expect((await createSpaceMonitor(deps)("pixal3d", now, "rollback")).outcome).toBe("rollback_rejected");
    expect(deps.complete).toHaveBeenCalledWith("pixal3d", "lease", expect.objectContaining({ activeTarget: active, previousTarget: fallback, preserveSchedule: true }));
  });
  it("cannot announce a switch after the lease was lost", async () => {
    vi.mocked(deps.complete).mockResolvedValue(false);
    expect((await createSpaceMonitor(deps)("pixal3d", now)).outcome).toBe("lease_lost");
    expect(deps.release).toHaveBeenCalledWith("pixal3d", "lease");
  });
  it("releases its lease on an unexpected provider failure", async () => {
    vi.mocked(deps.probe).mockRejectedValue(new Error("offline"));
    await expect(createSpaceMonitor(deps)("pixal3d", now)).rejects.toThrow("offline");
    expect(deps.release).toHaveBeenCalledWith("pixal3d", "lease");
    expect(deps.complete).not.toHaveBeenCalled();
  });
});
