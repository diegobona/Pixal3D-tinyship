import { pgTable, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { user } from "./user";

// 订阅状态枚举
export const subscriptionStatus = {
  ACTIVE: "active",           // 活跃订阅 - 用户可正常使用服务
  CANCELED: "canceled",       // 用户主动取消订阅
  CANCELLED: "canceled",      // Alias for compatibility
  EXPIRED: "expired",         // 订阅失效（到期、续费失败、或其他原因）
  TRIALING: "trialing",      // 试用期
  INACTIVE: "inactive"       // 未激活
} as const;

// 支付类型枚举
export const paymentTypes = {
  ONE_TIME: "one_time",
  RECURRING: "recurring"
} as const;

// 订阅表
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  planId: text("plan_id").notNull(), // 对应 config.payment.plans 中的 id
  status: text("status").notNull(), // active, canceled, past_due, unpaid, trialing
  paymentType: text("payment_type").notNull(), // one_time, recurring
  
  // Stripe 相关字段
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  
  // Creem related fields
  creemCustomerId: text("creem_customer_id"),
  creemSubscriptionId: text("creem_subscription_id"),
  
  // PayPal related fields
  paypalSubscriptionId: text("paypal_subscription_id"),
  
  // Subscription period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),

  // 元数据
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}); 