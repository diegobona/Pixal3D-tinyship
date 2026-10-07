import { SPACE_DEFAULT_TARGETS, isTrustedSpaceTarget } from "../../config/space-workspaces";
import { createSpaceMonitor } from "./engine";
import { probeSpace, discoverReplacement } from "./provider";
import { claimSpaceCheck, completeSpaceCheck, releaseSpaceCheck, readSpaceState } from "./store";
import type { SpaceModelId, SpaceTarget } from "./types";

export { readSpaceState } from "./store";
export const runSpaceMonitor = createSpaceMonitor({
  claim: claimSpaceCheck,
  complete: completeSpaceCheck,
  release: releaseSpaceCheck,
  probe: probeSpace,
  discover: discoverReplacement,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

/** Reading this route never probes HF or starts a model job. */
export async function resolveSpaceTarget(model: SpaceModelId): Promise<SpaceTarget> {
  try {
    const state = await readSpaceState(model);
    if (state && isTrustedSpaceTarget(model, state.activeTarget)) return state.activeTarget;
  } catch {
    console.warn("[space-monitor] resolver_storage_unavailable", model);
  }
  return SPACE_DEFAULT_TARGETS[model];
}
