import { SPACE_DEFAULT_TARGETS, isTrustedSpaceTarget } from "../../config/space-workspaces";
import type { ProbeResult, SpaceModelId, SpaceTarget } from "./types";
import type { MonitorState } from "./store";

export interface MonitorResult {
  outcome: "skipped" | "healthy" | "deferred" | "unresolved" | "switched" | "rolled_back" | "rollback_rejected" | "error" | "lease_lost";
  reason: string;
  from?: string;
  to?: string;
}

export interface MonitorDependencies {
  claim: (model: SpaceModelId, target: SpaceTarget, now: Date, force?: boolean) => Promise<{ token: string; state: MonitorState } | null>;
  complete: (model: SpaceModelId, token: string, change: { now: Date; activeTarget: SpaceTarget; previousTarget: SpaceTarget | null; result: MonitorResult; preserveSchedule?: boolean }) => Promise<boolean>;
  release: (model: SpaceModelId, token: string) => Promise<boolean>;
  probe: (model: SpaceModelId, target: SpaceTarget) => Promise<ProbeResult>;
  discover: (model: SpaceModelId, excludedSpaceId: string) => Promise<{ target: SpaceTarget | null; reason: string }>;
  wait: (ms: number) => Promise<void>;
}

/** A lease spans confirmation and discovery. Only its current owner may publish a target. */
export function createSpaceMonitor(deps: MonitorDependencies) {
  return async function run(model: SpaceModelId, now = new Date(), action: "check" | "rollback" = "check"): Promise<MonitorResult> {
    const claim = await deps.claim(model, SPACE_DEFAULT_TARGETS[model], now, action === "rollback");
    if (!claim) return { outcome: "skipped", reason: "not_due_or_already_running" };
    const { token, state } = claim;
    let activeTarget = isTrustedSpaceTarget(model, state.activeTarget) ? state.activeTarget : SPACE_DEFAULT_TARGETS[model];
    let previousTarget = state.previousTarget && isTrustedSpaceTarget(model, state.previousTarget) ? state.previousTarget : null;
    let completed = false;
    try {
      let result: MonitorResult;
      if (action === "rollback") {
        const previous = previousTarget && await deps.probe(model, previousTarget);
        if (previous?.status === "healthy" && previous.target && isTrustedSpaceTarget(model, previous.target)) {
          const old = activeTarget;
          activeTarget = previous.target;
          previousTarget = old;
          result = { outcome: "rolled_back", reason: "previous_target_revalidated", from: old.spaceId, to: activeTarget.spaceId };
        } else {
          result = { outcome: "rollback_rejected", reason: previous?.reason ?? "no_previous_target" };
        }
      } else {
        let probe = await deps.probe(model, activeTarget);
        if (probe.status === "unavailable") {
          await deps.wait(2_000);
          probe = await deps.probe(model, activeTarget);
        }
        if (probe.status === "healthy") {
          if (probe.target && isTrustedSpaceTarget(model, probe.target)) activeTarget = probe.target;
          result = { outcome: "healthy", reason: probe.reason };
        } else if (probe.status !== "unavailable") {
          result = { outcome: "deferred", reason: probe.reason };
        } else {
          const replacement = await deps.discover(model, activeTarget.spaceId);
          if (replacement.target && replacement.target.spaceId !== activeTarget.spaceId && isTrustedSpaceTarget(model, replacement.target)) {
            previousTarget = activeTarget;
            activeTarget = replacement.target;
            result = { outcome: "switched", reason: replacement.reason, from: previousTarget.spaceId, to: activeTarget.spaceId };
          } else {
            result = { outcome: "unresolved", reason: replacement.reason };
          }
        }
      }
      completed = await deps.complete(model, token, { now, activeTarget, previousTarget, result, preserveSchedule: result.outcome === "rollback_rejected" });
      return completed ? result : { outcome: "lease_lost", reason: "result_not_published" };
    } finally {
      // Also makes a crashed network probe retryable at the next daily trigger.
      if (!completed) await deps.release(model, token);
    }
  };
}
