import { pgTable, text, timestamp, numeric, jsonb } from "drizzle-orm/pg-core";
import { user } from "./user";
import { subscription } from './subscription';

// 订单状态枚举
export const orderStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELED: "canceled"
} as const;

// 支付提供商枚举
export const paymentProviders = {
  WECHAT: "wechat",
  STRIPE: "stripe",
  CREEM: "creem",
  PAYPAL: "paypal",
} as const;

// 订单表
export const order = pgTable("order", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  planId: text("plan_id").notNull(), // 对应 config.payment.plans 中的 id
  status: text("status").notNull(), // pending, paid, failed
  provider: text("provider").notNull(), // wechat, stripe, creem, paypal
  providerOrderId: text("provider_order_id"), // 支付平台的订单ID
  metadata: jsonb("metadata"), // 存储支付平台返回的额外信息
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}); 