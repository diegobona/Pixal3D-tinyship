import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { SpaceModelId, SpaceTarget } from "../../space-monitor/types";

export const spaceMonitor = pgTable("space_monitor", {
  modelId: text("model_id").$type<SpaceModelId>().primaryKey(),
  activeTarget: jsonb("active_target").$type<SpaceTarget>().notNull(),
  previousTarget: jsonb("previous_target").$type<SpaceTarget>(),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  nextCheckAt: timestamp("next_check_at", { withTimezone: true }).notNull(),
  lastResult: jsonb("last_result").$type<unknown>(),
  history: jsonb("history").$type<unknown[]>().default([]).notNull(),
  leaseToken: text("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("space_monitor_model_id_check", sql`${table.modelId} in ('pixal3d', 'trellis', 'hunyuan3d')`),
  check("space_monitor_history_check", sql`jsonb_typeof(${table.history}) = 'array'`),
  check("space_monitor_lease_check", sql`(${table.leaseToken} is null) = (${table.leaseUntil} is null)`),
]);
