import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const painPointFeedback = pgTable(
  "pain_point_feedback",
  {
    id: text("id").primaryKey(),
    painPoint: text("pain_point").notNull(),
    selectedPainPoints: jsonb("selected_pain_points").$type<string[]>().default([]).notNull(),
    otherText: text("other_text"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    userEmail: text("user_email"),
    pageUrl: text("page_url"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pain_point_feedback_created_idx").on(table.createdAt),
    index("pain_point_feedback_pain_point_idx").on(table.painPoint),
    index("pain_point_feedback_user_idx").on(table.userId),
  ],
);

export type PainPointFeedback = InferSelectModel<typeof painPointFeedback>;
export type NewPainPointFeedback = InferInsertModel<typeof painPointFeedback>;
