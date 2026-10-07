import { isSpaceModelId } from "@config/space-workspaces";
import { readSpaceState, runSpaceMonitor } from "@libs/space-monitor";
import { authorizeMonitor, monitorCheckTime } from "@libs/space-monitor/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
type Context = { params: Promise<{ model: string }> };

async function validate(request: Request, context: Context) {
  const auth = authorizeMonitor(request);
  if (auth !== 200) return Response.json({ error: auth === 503 ? "monitor_secret_not_configured" : "unauthorized" }, { status: auth, headers });
  const { model } = await context.params;
  if (!isSpaceModelId(model)) return Response.json({ error: "unknown_model" }, { status: 404, headers });
  return model;
}

export async function GET(request: Request, context: Context) {
  const model = await validate(request, context);
  if (model instanceof Response) return model;
  try {
    const state = await readSpaceState(model);
    // The live lease token is internal; it is never needed by the operator.
    const { leaseToken: _token, ...status } = state ?? {};
    return Response.json({ model, status: state ? status : null }, { headers });
  } catch {
    return Response.json({ error: "monitor_storage_unavailable" }, { status: 503, headers });
  }
}

export async function POST(request: Request, context: Context) {
  const model = await validate(request, context);
  if (model instanceof Response) return model;
  const action = new URL(request.url).searchParams.get("action") ?? "check";
  if (action !== "check" && action !== "rollback") return Response.json({ error: "invalid_action" }, { status: 400, headers });
  try {
    const result = await runSpaceMonitor(model, monitorCheckTime(request), action);
    if (["switched", "unresolved", "rolled_back", "rollback_rejected", "lease_lost"].includes(result.outcome)) {
      console.info("[space-monitor]", model, result.outcome, result.from ?? "", result.to ?? "");
    }
    const status = result.outcome === "rollback_rejected" || result.outcome === "lease_lost" ? 409 : 200;
    return Response.json({ model, result }, { status, headers });
  } catch {
    console.error("[space-monitor] check_failed", model);
    return Response.json({ error: "monitor_check_failed" }, { status: 503, headers });
  }
}
