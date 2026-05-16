import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { user } from "./user";

// Credit transaction types
export const creditTransactionTypes = {
  PURCHASE: "purchase",       // Credits purchased via payment
  CONSUMPTION: "consumption", // Credits consumed by usage (e.g., AI chat)
  REFUND: "refund",           // Credits refunded
  BONUS: "bonus",             // Bonus credits awarded
  ADJUSTMENT: "adjustment"    // Manual adjustment by admin
} as const;

// Credit transaction table for detailed tracking
export const creditTransaction = pgTable("credit_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  
  // Transaction type: purchase, consumption, refund, bonus, adjustment
  type: text("type").notNull(),
  
  // Amount: positive for credit additions, negative for consumption
  amount: numeric("amount").notNull(),
  
  // Balance snapshot after this transaction
  balance: numeric("balance").notNull(),
  
  // Related order ID (for purchase transactions)
  orderId: text("order_id"),
  
  // Human-readable description
  description: text("description"),
  
  // Additional metadata (e.g., AI usage details: tokens, model, provider)
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CreditTransaction = InferSelectModel<typeof creditTransaction>;
export type NewCreditTransaction = InferInsertModel<typeof creditTransaction>;

