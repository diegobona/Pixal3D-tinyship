import { config } from '@config';
import { auth } from '@libs/auth';
import { db } from '@libs/database';
import { subscription } from '@libs/database/schema/subscription';
import { createPaymentProvider } from '@libs/payment';
import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(request.headers),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const returnUrl = body.returnUrl || `${config.app.baseUrl}/dashboard/subscription`;

    const subscriptions = await db.query.subscription.findMany({
      where: eq(subscription.userId, session.user.id),
      orderBy: [desc(subscription.createdAt)],
    });

    const activeSubscription =
      subscriptions.find((sub) => sub.status === 'active') ||
      subscriptions.find((sub) => sub.status === 'paid') ||
      subscriptions[0];

    if (!activeSubscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'Stripe subscription not found' }, { status: 404 });
    }

    const stripeProvider = createPaymentProvider('stripe');
    const portalSession = await stripeProvider.createCustomerPortal(
      activeSubscription.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Failed to create subscription portal session:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
