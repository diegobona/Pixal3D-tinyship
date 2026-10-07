import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../libs/space-monitor/store", () => ({
  readSpaceState: store.read, claimSpaceCheck: vi.fn(), completeSpaceCheck: vi.fn(), releaseSpaceCheck: vi.fn(),
}));
import { resolveSpaceTarget } from "../../../libs/space-monitor";
import { SPACE_DEFAULT_TARGETS } from "../../../config/space-workspaces";

beforeEach(() => {
  store.read.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("public persisted Space resolution", () => {
  it("resolves a previously verified replacement without probing providers", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const target = { spaceId: "TencentARC/Pixal3D", url: "https://tencentarc-pixal3d.hf.space" };
    store.read.mockResolvedValue({ activeTarget: target });
    expect(await resolveSpaceTarget("pixal3d")).toEqual(target);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([null, { activeTarget: null }, { activeTarget: { spaceId: "TencentARC/Pixal3D", url: "https://example.invalid" } }, { activeTarget: SPACE_DEFAULT_TARGETS.trellis }])("uses the original target for missing or invalid state %#", async (state) => {
    store.read.mockResolvedValue(state);
    expect(await resolveSpaceTarget("pixal3d")).toEqual(SPACE_DEFAULT_TARGETS.pixal3d);
  });
  it("keeps workspaces accessible during a storage outage", async () => {
    store.read.mockRejectedValue(new Error("database offline"));
    expect(await resolveSpaceTarget("hunyuan3d")).toEqual(SPACE_DEFAULT_TARGETS.hunyuan3d);
  });
});
