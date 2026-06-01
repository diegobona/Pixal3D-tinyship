import { config } from '@config';
import {
  PaymentProvider,
  PaymentParams,
  PaymentResult,
  WebhookVerification,
  PaymentPlan,
} from '../types';
import { db } from '@libs/database';
import {
  subscription as userSubscription,
  subscriptionStatus,
  paymentTypes,
} from '@libs/database/schema/subscription';
import { order, orderStatus } from '@libs/database/schema/order';
import { creditTransaction } from '@libs/database/schema/credit-transaction';
import { eq } from 'drizzle-orm';
import { user } from '@libs/database/schema/user';
import { utcNow } from '@libs/database/utils/utc';
import { creditService, TransactionTypeCode } from '@libs/credits';
import {
  mapStripeSubscriptionStatus,
  syncStripeSubscriptionState,
} from '../stripe-subscription-sync';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2025-04-30.basil';

type StripeCustomer = {
  id: string;
  deleted?: boolean;
};

type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  mode?: 'payment' | 'subscription';
  payment_status?: string;
  customer?: string | StripeCustomer | null;
  subscription?: string | StripeSubscription | null;
  metadata?: Record<string, string> | null;
};

type StripeSubscription = {
  id: string;
  status: string;
  customer: string | StripeCustomer;
  cancel_at_period_end?: boolean;
  items: {
    data: Array<{
      current_period_start: number;
      current_period_end: number;
      price: {
        id: string;
      };
    }>;
  };
};

type StripeWebhookEvent = {
  type: string;
  data: {
    object: StripeCheckoutSession | StripeSubscription;
  };
};

function getObjectId(value: string | { id: string } | null | undefined): string {
  if (!value) {
    return '';
  }

  return typeof value === 'string' ? value : value.id;
}

function getPlan(planId: string): PaymentPlan {
  return config.payment.plans[planId as keyof typeof config.payment.plans] as PaymentPlan;
}

function appendMetadata(body: URLSearchParams, metadata: Record<string, string>) {
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, value);
  }
}

function encodeHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = new Map(
    header.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key, value] as const;
    })
  );
  const timestamp = parts.get('t');
  const signature = parts.get('v1');

  if (!timestamp || !signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));

  return constantTimeEqual(encodeHex(digest), signature);
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.payment.providers.stripe.secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
      ...init?.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data?.error?.message || `Stripe request failed: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

async function stripePost<T>(path: string, body: URLSearchParams): Promise<T> {
  return stripeRequest<T>(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}

export async function retrieveStripeCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
}

export class StripeProvider implements PaymentProvider {
  async verifyCheckoutSession(sessionId: string): Promise<WebhookVerification> {
    const session = await retrieveStripeCheckoutSession(sessionId);

    if (!session?.payment_status) {
      return { success: false };
    }

    if (session.payment_status !== 'paid') {
      return { success: false };
    }

    if (session.mode === 'subscription') {
      return this.handleSubscriptionCreated(session);
    }

    return this.handleOneTimePayment(session);
  }

  async createPayment(params: PaymentParams): Promise<PaymentResult> {
    const plan = getPlan(params.planId);

    if (plan.duration.type === 'recurring') {
      return this.createSubscription(params, plan);
    }

    return this.createOneTimePayment(params, plan);
  }

  private async createSubscription(params: PaymentParams, plan: PaymentPlan): Promise<PaymentResult> {
    const customer = await this.getOrCreateCustomer(params.userId);
    const session = await this.createCheckoutSession({
      customerId: customer.id,
      priceId: plan.stripePriceId!,
      mode: 'subscription',
      metadata: {
        orderId: params.orderId,
        userId: params.userId,
        planId: params.planId,
      },
    });

    return {
      paymentUrl: session.url || '',
      providerOrderId: session.id,
      metadata: {
        customerId: customer.id,
        sessionId: session.id,
      },
    };
  }

  private async createOneTimePayment(params: PaymentParams, plan: PaymentPlan): Promise<PaymentResult> {
    const customer = await this.getOrCreateCustomer(params.userId);
    const session = await this.createCheckoutSession({
      customerId: customer.id,
      priceId: plan.stripePriceId!,
      mode: 'payment',
      metadata: {
        orderId: params.orderId,
        userId: params.userId,
        planId: params.planId,
      },
    });

    return {
      paymentUrl: session.url || '',
      providerOrderId: session.id,
      metadata: {
        sessionId: session.id,
      },
    };
  }

  private async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    mode: 'payment' | 'subscription';
    metadata: Record<string, string>;
  }): Promise<StripeCheckoutSession> {
    const body = new URLSearchParams();
    body.set('customer', params.customerId);
    body.set('line_items[0][price]', params.priceId);
    body.set('line_items[0][quantity]', '1');
    body.set('mode', params.mode);
    body.set('success_url', `${config.app.payment.successUrl}?session_id={CHECKOUT_SESSION_ID}&provider=stripe`);
    body.set('cancel_url', config.app.payment.cancelUrl);
    appendMetadata(body, params.metadata);

    return stripePost<StripeCheckoutSession>('/checkout/sessions', body);
  }

  async handleWebhook(payload: string | Record<string, any>, signature: string): Promise<WebhookVerification> {
    try {
      const payloadText = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = await verifyStripeSignature(
        payloadText,
        signature,
        config.payment.providers.stripe.webhookSecret
      );

      if (!isValid) {
        return { success: false };
      }

      const event = JSON.parse(payloadText) as StripeWebhookEvent;

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as StripeCheckoutSession;
          if (session.mode === 'subscription') {
            return this.handleSubscriptionCreated(session);
          }
          return this.handleOneTimePayment(session);
        }

        case 'customer.subscription.updated':
          return this.handleSubscriptionUpdated(event.data.object as StripeSubscription);

        case 'customer.subscription.deleted':
          return this.handleSubscriptionDeleted(event.data.object as StripeSubscription);

        default:
          return { success: true };
      }
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return { success: false };
    }
  }

  private async handleSubscriptionCreated(session: StripeCheckoutSession): Promise<WebhookVerification> {
    if (!session.subscription || !session.metadata?.orderId) {
      return { success: false };
    }

    const subscriptionId = getObjectId(session.subscription);
    const subscription = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
    const subscriptionItem = subscription.items.data[0];
    const periodStart = new Date(subscriptionItem.current_period_start * 1000);
    const periodEnd = new Date(subscriptionItem.current_period_end * 1000);

    console.log(`Stripe subscription created - Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    await db.update(order)
      .set({ status: orderStatus.PAID })
      .where(eq(order.id, session.metadata.orderId));

    const existingSubscription = await db.query.subscription.findFirst({
      where: eq(userSubscription.stripeSubscriptionId, subscription.id),
    });

    if (existingSubscription) {
      await db
        .update(userSubscription)
        .set({
          userId: session.metadata.userId,
          planId: session.metadata.planId,
          status: subscriptionStatus.ACTIVE,
          paymentType: paymentTypes.RECURRING,
          stripeCustomerId: getObjectId(session.customer),
          periodStart,
          periodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(userSubscription.id, existingSubscription.id));
    } else {
      await db.insert(userSubscription).values({
        id: crypto.randomUUID(),
        userId: session.metadata.userId,
        planId: session.metadata.planId,
        status: subscriptionStatus.ACTIVE,
        paymentType: paymentTypes.RECURRING,
        stripeCustomerId: getObjectId(session.customer),
        stripeSubscriptionId: subscription.id,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: false,
        metadata: JSON.stringify({
          sessionId: session.id,
        }),
      });
    }

    await this.grantSubscriptionCredits({
      userId: session.metadata.userId,
      orderId: session.metadata.orderId,
      planId: session.metadata.planId,
      sessionId: session.id,
      subscriptionId: subscription.id,
      periodStart,
      periodEnd,
    });

    return { success: true, orderId: session.metadata.orderId };
  }

  private async grantSubscriptionCredits(params: {
    userId: string;
    orderId: string;
    planId: string;
    sessionId: string;
    subscriptionId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<void> {
    const plan = getPlan(params.planId);
    const credits = plan.credits ?? 0;

    if (credits <= 0) {
      return;
    }

    const [existingGrant] = await db
      .select({ id: creditTransaction.id })
      .from(creditTransaction)
      .where(eq(creditTransaction.orderId, params.orderId))
      .limit(1);

    if (existingGrant) {
      console.log(`Stripe subscription credits already granted for order ${params.orderId}`);
      return;
    }

    console.log(`Stripe subscription purchase - Adding ${credits} credits to user ${params.userId}`);

    await creditService.addCredits({
      userId: params.userId,
      amount: credits,
      type: 'purchase',
      orderId: params.orderId,
      description: TransactionTypeCode.PURCHASE,
      metadata: {
        sessionId: params.sessionId,
        subscriptionId: params.subscriptionId,
        planId: params.planId,
        provider: 'stripe',
        subscriptionCreditGrantKind: 'initial',
        subscriptionCreditCycle: 0,
        subscriptionCreditGrantKey: `${params.subscriptionId}:0`,
        periodStart: params.periodStart.toISOString(),
        periodEnd: params.periodEnd.toISOString(),
      },
    });
  }

  private async handleOneTimePayment(session: StripeCheckoutSession): Promise<WebhookVerification> {
    if (!session.metadata?.orderId) {
      return { success: false };
    }

    const now = utcNow();
    const plan = getPlan(session.metadata.planId);

    await db.update(order)
      .set({ status: orderStatus.PAID })
      .where(eq(order.id, session.metadata.orderId));

    if (plan.duration.type === 'credits' && plan.credits) {
      console.log(`Stripe credit pack purchase - Adding ${plan.credits} credits to user ${session.metadata.userId}`);

      await creditService.addCredits({
        userId: session.metadata.userId,
        amount: plan.credits,
        type: 'purchase',
        orderId: session.metadata.orderId,
        description: TransactionTypeCode.PURCHASE,
        metadata: {
          sessionId: session.id,
          planId: session.metadata.planId,
          provider: 'stripe',
        },
      });

      return { success: true, orderId: session.metadata.orderId };
    }

    const periodEnd = new Date(now);
    const months = plan.duration.months ?? 1;

    if (months >= 9999) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + months);
    }

    console.log(`Stripe one-time payment - Period: ${now.toISOString()} to ${periodEnd.toISOString()}`);

    await db.insert(userSubscription).values({
      id: crypto.randomUUID(),
      userId: session.metadata.userId,
      planId: session.metadata.planId,
      status: subscriptionStatus.ACTIVE,
      paymentType: paymentTypes.ONE_TIME,
      stripeCustomerId: getObjectId(session.customer),
      periodStart: now,
      periodEnd,
      cancelAtPeriodEnd: true,
      metadata: JSON.stringify({
        sessionId: session.id,
        isLifetime: months >= 9999,
      }),
    });

    return { success: true, orderId: session.metadata.orderId };
  }

  private async handleSubscriptionUpdated(stripeSubscription: StripeSubscription): Promise<WebhookVerification> {
    const updatedSubscription = await syncStripeSubscriptionState(stripeSubscription);

    if (!updatedSubscription) {
      return { success: false };
    }

    return { success: true };
  }

  private async handleSubscriptionDeleted(stripeSubscription: StripeSubscription): Promise<WebhookVerification> {
    const updatedSubscription = await syncStripeSubscriptionState({
      ...stripeSubscription,
      status: stripeSubscription.status || 'canceled',
      cancel_at_period_end: true,
    });

    if (!updatedSubscription) {
      return { success: false };
    }

    return { success: true };
  }

  private async getOrCreateCustomer(userId: string): Promise<StripeCustomer> {
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!userRecord) {
      throw new Error('User not found');
    }

    if (userRecord.stripeCustomerId) {
      try {
        const customer = await stripeRequest<StripeCustomer>(
          `/customers/${encodeURIComponent(userRecord.stripeCustomerId)}`
        );
        if (!customer.deleted) {
          return customer;
        }
      } catch (error) {
        console.error('Error retrieving Stripe customer:', error);
      }
    }

    const body = new URLSearchParams();
    body.set('email', userRecord.email);
    if (userRecord.name) {
      body.set('name', userRecord.name);
    }
    if (userRecord.phoneNumber) {
      body.set('phone', userRecord.phoneNumber);
    }
    body.set('metadata[userId]', userId);

    const customer = await stripePost<StripeCustomer>('/customers', body);

    await db.update(user)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    return customer;
  }

  async closeOrder(orderId: string): Promise<boolean> {
    console.warn(`Stripe order close is a no-op: ${orderId}`);
    return false;
  }
}
