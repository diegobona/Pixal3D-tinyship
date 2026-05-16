import { withRequestClient } from '@libs/database'

/**
 * Wraps a TanStack API route handler so that all DB operations
 * within a single HTTP request share one pg.Client connection.
 * In non-Workers environments this is a zero-cost passthrough.
 */
export function withCfDb<T extends { request: Request }>(
  handler: (ctx: T) => Promise<Response>,
): (ctx: T) => Promise<Response> {
  return (ctx: T) => withRequestClient(() => handler(ctx))
}
