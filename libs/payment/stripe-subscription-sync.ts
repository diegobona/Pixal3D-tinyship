import { config } from '@config';
import { getEnv } from '../../config/utils';
import { db } from '@libs/database';
import { creditTransaction } from '@libs/database/schema/credit-transaction';
import {
  subscription as subscriptionTable,
  subscriptionStatus,
} from '@libs/database/schema/subscription';
import { creditService, TransactionTypeCode } from '@libs/credits';
import { desc, eq, sql } from 'drizzle-orm';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2025-04-30.basil';

type StripeCustomerRef = string | { id: string } | null | undefined;

export type StripeSubscriptionSnapshot = {
  id: string;
  status: string;
  customer?: StripeCustomerRef;
  cancel_at_period_end?: boolean;
  items?: {
    data?: Array<{
      current_period_start?: number;
      current_period_end?: number;
      price?: {
        id?: string;
      };
    }>;
  };
};

type SubscriptionRow = typeof subscriptionTable.$inferSelect;

function getObjectId(value: StripeCustomerRef): string {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value.id;
}

export function mapStripeSubscriptionStatus(status: string): string {
  switch (status) {
    case 'active':
      return subscriptionStatus.ACTIVE;
    case 'canceled':
      return subscriptionStatus.CANCELED;
    case 'past_due':
    case 'unpaid':
    case 'incomplete_expired':
      return subscriptionStatus.EXPIRED;
    case 'trialing':
      return subscriptionStatus.TRIALING;
    default:
      return subscriptionStatus.INACTIVE;
  }
}

function getPlanIdFromPrice(priceId: string | undefined, fallbackPlanId: string): string {
  if (!priceId) {
    return fallbackPlanId;
  }

  for (const [planId, planDetails] of Object.entries(config.payment.plans)) {
    if (planDetails.provider === 'stripe' && planDetails.stripePriceId === priceId) {
      return planId;
    }
  }

  return fallbackPlanId;
}

async function revokeSubscriptionCreditsIfNeeded(
  subscriptionRecord: SubscriptionRow,
  stripeSubscriptionId: string,
  status: string
): Promise<void> {
  if (status !== subscriptionStatus.CANCELED && status !== subscriptionStatus.EXPIRED) {
    return;
  }

  const [existingRevoke] = await db
    .select({ id: creditTransaction.id })
    .from(creditTransaction)
    .where(
      sql`${creditTransaction.userId} = ${subscriptionRecord.userId}
        AND ${creditTransaction.type} = 'adjustment'
        AND ${creditTransaction.metadata}->>'reason' = 'subscription_canceled'
        AND ${creditTransaction.metadata}->>'subscriptionId' = ${stripeSubscriptionId}`
    )
    .limit(1);

  if (existingRevoke) {
    return;
  }

  const [purchaseGrant] = await db
    .select({
      id: creditTransaction.id,
      amount: creditTransaction.amount,
      orderId: creditTransaction.orderId,
    })
    .from(creditTransaction)
    .where(
      sql`${creditTransaction.userId} = ${subscriptionRecord.userId}
        AND ${creditTransaction.type} = 'purchase'
        AND ${creditTransaction.metadata}->>'subscriptionId' = ${stripeSubscriptionId}`
    )
    .limit(1);

  const grantedAmount = parseFloat(purchaseGrant?.amount || '0') || 0;

  if (grantedAmount <= 0) {
    return;
  }

  await creditService.revokeCredits({
    userId: subscriptionRecord.userId,
    amount: grantedAmount,
    transactionId: `txn_revoke_${stripeSubscriptionId}`,
    orderId: purchaseGrant.orderId,
    description: TransactionTypeCode.ADJUSTMENT,
    metadata: {
      provider: 'stripe',
      reason: 'subscription_canceled',
      subscriptionId: stripeSubscriptionId,
      originalTransactionId: purchaseGrant.id,
    },
  });
}

async function fetchStripeSubscription(
  stripeSubscriptionId: string
): Promise<StripeSubscriptionSnapshot | null> {
  const secretKey = getEnv('STRIPE_SECRET_KEY');

  if (!secretKey) {
    return null;
  }

  const response = await fetch(
    `${STRIPE_API_BASE}/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    console.warn(
      `Stripe subscription sync skipped for ${stripeSubscriptionId}: ${response.status}`
    );
    return null;
  }

  return (await response.json()) as StripeSubscriptionSnapshot;
}

export async function syncStripeSubscriptionState(
  stripeSubscription: StripeSubscriptionSnapshot
): Promise<SubscriptionRow | null> {
  const stripeCustomerId = getObjectId(stripeSubscription.customer);

  let existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscriptionTable.stripeSubscriptionId, stripeSubscription.id),
  });

  if (!existingSubscription && stripeCustomerId) {
    existingSubscription = await db.query.subscription.findFirst({
      where: eq(subscriptionTable.stripeCustomerId, stripeCustomerId),
      orderBy: [desc(subscriptionTable.createdAt)],
    });
  }

  if (!existingSubscription) {
    console.error(`Subscription not found for Stripe subscription: ${stripeSubscription.id}`);
    return null;
  }

  const subscriptionItem = stripeSubscription.items?.data?.[0];
  const periodStart = subscriptionItem?.current_period_start
    ? new Date(subscriptionItem.current_period_start * 1000)
    : existingSubscription.periodStart;
  const periodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000)
    : existingSubscription.periodEnd;
  const planId = getPlanIdFromPrice(subscriptionItem?.price?.id, existingSubscription.planId);
  const status = mapStripeSubscriptionStatus(stripeSubscription.status);

  const [updatedSubscription] = await db
    .update(subscriptionTable)
    .set({
      status,
      planId,
      stripeCustomerId: stripeCustomerId || existingSubscription.stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: !!stripeSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionTable.id, existingSubscription.id))
    .returning();

  if (updatedSubscription) {
    await revokeSubscriptionCreditsIfNeeded(updatedSubscription, stripeSubscription.id, status);
  }

  return updatedSubscription || null;
}

export async function syncStripeSubscriptionFromStripe(
  stripeSubscriptionId: string
): Promise<SubscriptionRow | null> {
  try {
    const stripeSubscription = await fetchStripeSubscription(stripeSubscriptionId);
    if (!stripeSubscription) {
      return null;
    }

    return syncStripeSubscriptionState(stripeSubscription);
  } catch (error) {
    console.warn(`Stripe subscription sync failed for ${stripeSubscriptionId}:`, error);
    return null;
  }
}
