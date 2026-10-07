import { timingSafeEqual, createHash } from "node:crypto";

/** Shared only by the operator endpoints. Public iframe resolution needs no token. */
export function authorizeMonitor(request: Request, expected = process.env.SPACE_MONITOR_SECRET): 200 | 401 | 503 {
  if (!expected) return 503;
  const bearer = request.headers.get("authorization") ?? "";
  const supplied = request.headers.get("x-cron-secret")
    || (bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "");
  if (!supplied || supplied.length > 4096) return 401;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(supplied), digest(expected)) ? 200 : 401;
}

/** Use the trigger's fixed time so daily delivery jitter cannot turn 72h into 96h. */
export function monitorCheckTime(request: Request, now = new Date()): Date {
  const scheduled = Number(request.headers.get("x-cron-scheduled-time"));
  return Number.isFinite(scheduled) && Math.abs(now.getTime() - scheduled) < 15 * 60_000
    ? new Date(scheduled)
    : now;
}
