import type {
  ThreeDGenerationResult,
  ThreeDGenerationStatus,
  ThreeDResolution,
  ThreeDTextureSize,
} from "../../ai/3d";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const pixal3dGeneration = pgTable(
  "pixal3d_generation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    inputImageUrl: text("input_image_url").notNull(),
    prompt: text("prompt").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").$type<ThreeDGenerationStatus>().notNull(),
    providerTaskId: text("provider_task_id").notNull(),
    creditCost: integer("credit_cost").notNull().default(0),
    resolution: integer("resolution").$type<ThreeDResolution>().notNull(),
    textureSize: integer("texture_size").$type<ThreeDTextureSize>().notNull(),
    consumeTransactionId: text("consume_transaction_id"),
    refunded: boolean("refunded").notNull().default(false),
    result: jsonb("result").$type<ThreeDGenerationResult | null>(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("pixal3d_generation_user_created_idx").on(table.userId, table.createdAt),
    index("pixal3d_generation_provider_task_idx").on(table.providerTaskId),
  ]
);

export type Pixal3dGeneration = InferSelectModel<typeof pixal3dGeneration>;
export type NewPixal3dGeneration = InferInsertModel<typeof pixal3dGeneration>;
