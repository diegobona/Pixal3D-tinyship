import { auth } from "@libs/auth";
import { createPaymentProvider } from "@libs/payment";
import { nanoid } from "nanoid";
import { db } from "@libs/database";
import { order, orderStatus, paymentProviders } from "@libs/database/schema/order";
import {
  subscription,
  subscriptionStatus,
} from "@libs/database/schema/subscription";
import { config } from "@config";
import { and, eq } from "drizzle-orm";

function isMissingStripePriceId(priceId?: string) {
  return !priceId || priceId.includes("replace_me");
}

export async function POST(req: Request) {
  try {
    // 1. Get user session (authMiddleware已验证用户已登录)
    const requestHeaders = new Headers(req.headers);
    const session = await auth.api.getSession({
      headers: requestHeaders
    });
    if (!session?.user?.id) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // 2. Get request parameters
    const { planId, provider = paymentProviders.STRIPE } = await req.json();
    if (!planId) {
      return Response.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    if (provider !== paymentProviders.STRIPE) {
      return Response.json({ error: 'Unsupported payment provider' }, { status: 400 });
    }

    // 3. Create order record
    const orderId = nanoid();
    const plan = config.payment.plans[planId as keyof typeof config.payment.plans];
    if (!plan) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const stripePriceId = "stripePriceId" in plan ? plan.stripePriceId : undefined;
    if (plan.provider !== "stripe" || isMissingStripePriceId(stripePriceId)) {
      console.error("Stripe price ID is not configured for payment plan", {
        planId,
        provider: plan.provider,
        hasStripePriceId: Boolean(stripePriceId),
      });
      return Response.json(
        { error: "Stripe price ID is not configured for this plan" },
        { status: 500 }
      );
    }

    const existingSubscription = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.userId, session.user.id),
        eq(subscription.planId, planId),
        eq(subscription.status, subscriptionStatus.ACTIVE)
      ),
    });

    if (existingSubscription) {
      const now = new Date();

      if (existingSubscription.periodEnd > now) {
        return Response.json(
          { error: "You already have an active subscription for this plan." },
          { status: 409 }
        );
      }

      await db
        .update(subscription)
        .set({
          status: subscriptionStatus.EXPIRED,
          updatedAt: now,
        })
        .where(eq(subscription.id, existingSubscription.id));
    }

    await db.insert(order).values({
      id: orderId,
      userId: session.user.id,
      planId,
      amount: plan.amount.toString(), // Convert to string for numeric field
      currency: plan.currency,
      status: orderStatus.PENDING,
      provider,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Order created:', orderId);

    // 4. Create payment provider instance and initiate payment
    const paymentProvider = createPaymentProvider('stripe');
    // x-forwarded-for may contain multiple IPs (comma-separated), we only need the first one
    // WeChat Pay requires payer_client_ip to be max 45 bytes
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const clientIp = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : (realIp || '127.0.0.1')
    
    const result = await paymentProvider.createPayment({
      orderId,
      userId: session.user.id,
      planId,
      amount: plan.amount,
      currency: plan.currency,
      metadata: {
        clientIp,
        // description: `${plan.name} - ${plan.duration.description}`
      }
    });
    // Save provider order ID and metadata for later capture/verification
    await db.update(order)
      .set({
        providerOrderId: result.providerOrderId,
        metadata: result.metadata || {},
        updatedAt: new Date()
      })
      .where(eq(order.id, orderId));

    console.log('Payment initiation result:', result);
    return Response.json(result);
  } catch (error) {
    console.error('Payment initiation error:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error);
    return Response.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
} 
