import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Client } from "pg";
import { config as loadEnv } from "dotenv";
import type { MonitorState } from "../../../libs/space-monitor/store";

const { query, connect, end, ClientMock } = vi.hoisted(() => ({
  query: vi.fn(), connect: vi.fn().mockResolvedValue(undefined),
  end: vi.fn().mockResolvedValue(undefined), ClientMock: vi.fn(),
}));
vi.mock("@libs/database", () => ({ pool: { query }, getConnectionString: () => "postgresql://unit-test.invalid/test" }));
vi.mock("pg", () => ({
  Client: class {
    constructor(options: unknown) { ClientMock(options); }
    connect = connect;
    query = query;
    end = end;
  },
}));

import {
  claimSpaceCheck, completeSpaceCheck, readSpaceState, releaseSpaceCheck,
  SPACE_CHECK_INTERVAL_MS,
} from "../../../libs/space-monitor/store";

const now = new Date("2026-10-30T08:00:00.000Z");
const target = {
  spaceId: "victor/pixal3d-studio", url: "https://victor-pixal3d-studio.hf.space",
  revision: "approved-revision", verifiedProfile: "pixal3d-t",
};
const state: MonitorState = {
  modelId: "pixal3d", activeTarget: target, previousTarget: null,
  lastCheckedAt: null, nextCheckAt: now, lastResult: null, history: [],
  leaseToken: "existing", leaseUntil: new Date(now.getTime() + 600_000),
  createdAt: now, updatedAt: now,
};

describe("durable Space monitor store", () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset().mockResolvedValue(undefined);
    end.mockReset().mockResolvedValue(undefined);
    ClientMock.mockClear();
  });

  it("returns no override when a model has not been initialized", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await readSpaceState("pixal3d")).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      values: ["pixal3d"],
    }));
    expect(ClientMock).toHaveBeenCalledWith(expect.objectContaining({
      connectionTimeoutMillis: 1_500, query_timeout: 1_500,
    }));
    expect(end).toHaveBeenCalledOnce();
  });

  it("preserves provider evidence and rejects storage errors for the caller to handle", async () => {
    query.mockResolvedValueOnce({ rows: [state] }).mockRejectedValueOnce(new Error("connection unavailable"));
    expect((await readSpaceState("pixal3d"))?.activeTarget).toEqual(target);
    await expect(readSpaceState("pixal3d")).rejects.toThrow("connection unavailable");
    expect(end).toHaveBeenCalledTimes(2);
  });

  it("closes a failed connection before the public caller falls back", async () => {
    connect.mockRejectedValue(new Error("connect timed out"));
    await expect(readSpaceState("pixal3d")).rejects.toThrow("connect timed out");
    expect(query).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledOnce();
  });

  it("does not split initialization and lease acquisition across competing queries", async () => {
    query.mockResolvedValueOnce({ rows: [state] }).mockResolvedValueOnce({ rows: [] });
    const [winner, blocked] = await Promise.all([
      claimSpaceCheck("pixal3d", target, now),
      claimSpaceCheck("pixal3d", target, now),
    ]);
    expect(winner?.state).toEqual(state);
    expect(winner?.token).toMatch(/^[a-f\d-]{36}$/);
    expect(blocked).toBeNull();
    expect(query).toHaveBeenCalledTimes(2);
    const command = query.mock.calls[0][0];
    expect(command.text).toContain("ON CONFLICT (model_id) DO UPDATE");
    expect(command.text).toContain("space_monitor.lease_until <= clock_timestamp()");
    expect(command.text).toContain("space_monitor.next_check_at <= $3::timestamptz");
    expect(command.values).toEqual(["pixal3d", JSON.stringify(target), now.toISOString(), winner?.token, false]);
  });

  it("a forced rollback may ignore the due date but still respects an active lease", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await claimSpaceCheck("pixal3d", target, now, true)).toBeNull();
    const command = query.mock.calls[0][0];
    expect(command.values[4]).toBe(true);
    expect(command.text).toMatch(/WHERE \(space_monitor\.lease_until IS NULL OR space_monitor\.lease_until <= clock_timestamp\(\)\)\s+AND/);
  });

  it("schedules exactly 72 hours from the cron anchor across a month boundary", async () => {
    query.mockResolvedValue({ rows: [{ model_id: "pixal3d" }] });
    const outcome = { status: "healthy", reason: "read-only probes passed" };
    expect(await completeSpaceCheck("pixal3d", "owner", {
      now, activeTarget: target, previousTarget: null, result: outcome,
    })).toBe(true);
    const command = query.mock.calls[0][0];
    expect(command.values[5]).toBe("2026-11-02T08:00:00.000Z");
    expect(SPACE_CHECK_INTERVAL_MS).toBe(259_200_000);
    expect(JSON.parse(command.values[7])).toEqual([{
      checkedAt: now.toISOString(), result: outcome,
      activeTarget: target, previousTarget: null,
    }]);
    expect(command.text).toContain("ORDER BY ordinality DESC LIMIT 20");
  });

  it("a stale or expired worker cannot commit a replacement", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await completeSpaceCheck("pixal3d", "stale-owner", {
      now, activeTarget: target, previousTarget: null, result: { status: "switched" },
    })).toBe(false);
    const command = query.mock.calls[0][0];
    expect(command.text).toContain("WHERE model_id = $1 AND lease_token = $2 AND lease_until > clock_timestamp()");
    expect(command.values.slice(0, 2)).toEqual(["pixal3d", "stale-owner"]);
  });

  it("can record a rejected rollback without postponing the active target's check", async () => {
    query.mockResolvedValue({ rows: [{ model_id: "pixal3d" }] });
    expect(await completeSpaceCheck("pixal3d", "owner", {
      now, activeTarget: target, previousTarget: null,
      result: { outcome: "rollback_rejected" }, preserveSchedule: true,
    })).toBe(true);
    const command = query.mock.calls[0][0];
    expect(command.values[8]).toBe(true);
    expect(command.text).toContain("last_checked_at = CASE WHEN $9::boolean THEN last_checked_at");
    expect(command.text).toContain("next_check_at = CASE WHEN $9::boolean THEN next_check_at");
    expect(JSON.parse(command.values[7])[0].result).toEqual({ outcome: "rollback_rejected" });
  });

  it("error cleanup preserves the due date and cannot clear another worker's lease", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ model_id: "pixal3d" }] });
    expect(await releaseSpaceCheck("pixal3d", "old-owner")).toBe(false);
    expect(await releaseSpaceCheck("pixal3d", "current-owner")).toBe(true);
    const command = query.mock.calls[1][0];
    expect(command.text).not.toContain("next_check_at");
    expect(command.text).toContain("WHERE model_id = $1 AND lease_token = $2");
    expect(command.values).toEqual(["pixal3d", "current-owner"]);
  });
});

// Explicitly opt in: this uses only a transaction-local TEMP table and rolls back.
// pg_temp is the entire search path, so these store queries cannot reach a public table.
describe.skipIf(process.env.SPACE_MONITOR_DB_INTEGRATION !== "1")("PostgreSQL temporary-table contract", () => {
  let client: Client | undefined;

  beforeAll(async () => {
    loadEnv({ path: resolve(process.cwd(), ".env.local") });
    loadEnv({ path: resolve(process.cwd(), ".env") });
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the opt-in temporary-table test");
    const { Client: RealClient } = await vi.importActual<typeof import("pg")>("pg");
    client = new RealClient({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
      query_timeout: 5_000,
    });
    try {
      await client.connect();
      await client.query("BEGIN");
      await client.query("SET LOCAL search_path TO pg_temp");
      const migration = readFileSync(resolve(process.cwd(), "libs/database/drizzle/0003_space_monitor.sql"), "utf8");
      if (!migration.startsWith('CREATE TABLE "space_monitor"')) throw new Error("Unexpected migration format");
      await client.query(migration.replace('CREATE TABLE "space_monitor"', 'CREATE TEMP TABLE "space_monitor"'));
      const schemas = await client.query<{ schemas: string[] }>("SELECT current_schemas(false)::text[] AS schemas");
      expect(schemas.rows[0].schemas).toHaveLength(1);
      expect(schemas.rows[0].schemas[0]).toMatch(/^pg_temp_\d+$/);
      connect.mockResolvedValue(undefined);
      end.mockResolvedValue(undefined);
      query.mockImplementation((command) => client!.query(command));
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      await client.end();
      client = undefined;
      throw error;
    }
  }, 20_000);

  afterAll(async () => {
    if (!client) return;
    try { await client.query("ROLLBACK"); }
    finally { await client.end(); }
  });

  it("enforces due dates, current lease ownership, expiry, JSON evidence and the history bound in PostgreSQL", async () => {
    const anchor = new Date();
    expect(await readSpaceState("pixal3d")).toBeNull();
    const first = await claimSpaceCheck("pixal3d", target, anchor);
    expect(first).not.toBeNull();
    expect(first!.state.activeTarget).toEqual(target);
    expect(await claimSpaceCheck("pixal3d", target, anchor)).toBeNull();
    expect(await claimSpaceCheck("pixal3d", target, anchor, true)).toBeNull();
    const replacement = { spaceId: "TencentARC/Pixal3D", url: "https://tencentarc-pixal3d.hf.space", verifiedProfile: "official-pixal3d-t" };
    const change = { now: anchor, activeTarget: replacement, previousTarget: target, result: { outcome: "switched" } };
    expect(await completeSpaceCheck("pixal3d", "stale-token", change)).toBe(false);
    expect(await releaseSpaceCheck("pixal3d", "stale-token")).toBe(false);
    expect(await completeSpaceCheck("pixal3d", first!.token, change)).toBe(true);
    let stored = await readSpaceState("pixal3d");
    expect(stored!.activeTarget).toEqual(replacement);
    expect(stored!.previousTarget).toEqual(target);
    expect(stored!.leaseToken).toBeNull();
    expect(stored!.nextCheckAt.getTime()).toBe(anchor.getTime() + SPACE_CHECK_INTERVAL_MS);

    const rejectedRollback = await claimSpaceCheck("pixal3d", target, anchor, true);
    expect(await completeSpaceCheck("pixal3d", rejectedRollback!.token, {
      ...change, now: new Date(anchor.getTime() + 120_000),
      result: { outcome: "rollback_rejected" }, preserveSchedule: true,
    })).toBe(true);
    stored = await readSpaceState("pixal3d");
    expect(stored!.lastCheckedAt!.getTime()).toBe(anchor.getTime());
    expect(stored!.nextCheckAt.getTime()).toBe(anchor.getTime() + SPACE_CHECK_INTERVAL_MS);
    expect(stored!.history.at(-1)!.result).toEqual({ outcome: "rollback_rejected" });
    expect(stored!.leaseToken).toBeNull();

    expect(await claimSpaceCheck("pixal3d", target, new Date(anchor.getTime() + SPACE_CHECK_INTERVAL_MS - 1))).toBeNull();
    const due = await claimSpaceCheck("pixal3d", target, new Date(anchor.getTime() + SPACE_CHECK_INTERVAL_MS));
    expect(due).not.toBeNull();
    expect(await releaseSpaceCheck("pixal3d", due!.token)).toBe(true);

    const expired = await claimSpaceCheck("pixal3d", target, anchor, true);
    await client!.query("UPDATE space_monitor SET lease_until = clock_timestamp() - interval '1 second' WHERE model_id = $1", ["pixal3d"]);
    expect(await completeSpaceCheck("pixal3d", expired!.token, change)).toBe(false);
    const newer = await claimSpaceCheck("pixal3d", target, anchor, true);
    expect(newer!.token).not.toBe(expired!.token);
    expect(await releaseSpaceCheck("pixal3d", expired!.token)).toBe(false);
    expect(await releaseSpaceCheck("pixal3d", newer!.token)).toBe(true);

    for (let index = 0; index < 25; index++) {
      const claimed = await claimSpaceCheck("pixal3d", target, anchor, true);
      expect(await completeSpaceCheck("pixal3d", claimed!.token, {
        ...change, previousTarget: null, result: { index },
      })).toBe(true);
    }
    stored = await readSpaceState("pixal3d");
    expect(stored!.previousTarget).toBeNull();
    expect(stored!.history).toHaveLength(20);
    expect(stored!.history[0].result).toEqual({ index: 5 });
    expect(stored!.history.at(-1)!.result).toEqual({ index: 24 });
  }, 30_000);
});
