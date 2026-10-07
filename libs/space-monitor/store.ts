import { getConnectionString, pool } from "@libs/database";
import { Client } from "pg";
import type { SpaceModelId, SpaceTarget } from "./types";

export const SPACE_CHECK_INTERVAL_MS = 72 * 60 * 60 * 1000;

export interface MonitorAuditEntry {
  checkedAt: string;
  result: unknown;
  activeTarget: SpaceTarget;
  previousTarget: SpaceTarget | null;
}

export interface MonitorState {
  modelId: SpaceModelId;
  activeTarget: SpaceTarget;
  previousTarget: SpaceTarget | null;
  lastCheckedAt: Date | null;
  nextCheckAt: Date;
  lastResult: unknown | null;
  history: MonitorAuditEntry[];
  leaseToken: string | null;
  leaseUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const stateColumns = `
  model_id AS "modelId", active_target AS "activeTarget",
  previous_target AS "previousTarget", last_checked_at AS "lastCheckedAt",
  next_check_at AS "nextCheckAt", last_result AS "lastResult", history,
  lease_token AS "leaseToken", lease_until AS "leaseUntil",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function readSpaceState(modelId: SpaceModelId): Promise<MonitorState | null> {
  // Public iframe resolution must also bound connection acquisition, not just the SQL query.
  const client = new Client({
    connectionString: getConnectionString(),
    connectionTimeoutMillis: 1_500,
    query_timeout: 1_500,
  });
  try {
    await client.connect();
    const result = await client.query<MonitorState>({
      text: `SELECT ${stateColumns} FROM space_monitor WHERE model_id = $1`,
      values: [modelId],
    });
    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

/** One PostgreSQL upsert owns both initialization and the due/lease decision. */
export async function claimSpaceCheck(
  modelId: SpaceModelId,
  defaultTarget: SpaceTarget,
  now: Date,
  force = false,
): Promise<{ token: string; state: MonitorState } | null> {
  const token = crypto.randomUUID();
  const result = await pool.query<MonitorState>({
    text: `INSERT INTO space_monitor
      (model_id, active_target, next_check_at, lease_token, lease_until, updated_at)
      VALUES ($1, $2::jsonb, $3::timestamptz, $4,
        clock_timestamp() + interval '10 minutes', clock_timestamp())
      ON CONFLICT (model_id) DO UPDATE SET
        lease_token = EXCLUDED.lease_token,
        lease_until = EXCLUDED.lease_until,
        updated_at = EXCLUDED.updated_at
      WHERE (space_monitor.lease_until IS NULL OR space_monitor.lease_until <= clock_timestamp())
        AND ($5::boolean OR space_monitor.next_check_at <= $3::timestamptz)
      RETURNING ${stateColumns}`,
    values: [modelId, JSON.stringify(defaultTarget), now.toISOString(), token, force],
  });
  const state = result.rows[0];
  return state ? { token, state } : null;
}

export interface CompleteSpaceCheckArgs {
  /** Scheduled anchor, so request duration does not turn a 72-hour cadence into 96 hours. */
  now: Date;
  activeTarget: SpaceTarget;
  previousTarget: SpaceTarget | null;
  result: unknown;
  /** A rejected rollback did not inspect the active target, so keep its existing check schedule. */
  preserveSchedule?: boolean;
}

export async function completeSpaceCheck(
  modelId: SpaceModelId,
  token: string,
  args: CompleteSpaceCheckArgs,
): Promise<boolean> {
  const audit: MonitorAuditEntry = {
    checkedAt: args.now.toISOString(),
    result: args.result,
    activeTarget: args.activeTarget,
    previousTarget: args.previousTarget,
  };
  const result = await pool.query({
    text: `UPDATE space_monitor SET
        active_target = $3::jsonb, previous_target = $4::jsonb,
        last_checked_at = CASE WHEN $9::boolean THEN last_checked_at ELSE $5::timestamptz END,
        next_check_at = CASE WHEN $9::boolean THEN next_check_at ELSE $6::timestamptz END,
        last_result = $7::jsonb,
        history = (SELECT jsonb_agg(entry ORDER BY position) FROM (
          SELECT value AS entry, ordinality AS position
          FROM jsonb_array_elements(space_monitor.history || $8::jsonb) WITH ORDINALITY
          ORDER BY ordinality DESC LIMIT 20
        ) AS recent),
        lease_token = NULL, lease_until = NULL, updated_at = clock_timestamp()
      WHERE model_id = $1 AND lease_token = $2 AND lease_until > clock_timestamp()
      RETURNING model_id`,
    values: [
      modelId, token, JSON.stringify(args.activeTarget),
      args.previousTarget === null ? null : JSON.stringify(args.previousTarget),
      args.now.toISOString(), new Date(args.now.getTime() + SPACE_CHECK_INTERVAL_MS).toISOString(),
      JSON.stringify(args.result ?? null), JSON.stringify([audit]), args.preserveSchedule ?? false,
    ],
  });
  return result.rows.length === 1;
}

/** Release only this worker's lease; a retry remains due and cannot clear a newer lease. */
export async function releaseSpaceCheck(modelId: SpaceModelId, token: string): Promise<boolean> {
  const result = await pool.query({
    text: `UPDATE space_monitor SET lease_token = NULL, lease_until = NULL,
        updated_at = clock_timestamp()
      WHERE model_id = $1 AND lease_token = $2 RETURNING model_id`,
    values: [modelId, token],
  });
  return result.rows.length === 1;
}
