import { isSpaceModelId } from "@config/space-workspaces";
import { resolveSpaceTarget } from "@libs/space-monitor";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer" };

export async function GET(_request: Request, context: { params: Promise<{ model: string }> }) {
  const { model } = await context.params;
  if (!isSpaceModelId(model)) return Response.json({ error: "unknown_model" }, { status: 404, headers });
  const target = await resolveSpaceTarget(model);
  return new Response(null, { status: 307, headers: { ...headers, Location: target.url } });
}
