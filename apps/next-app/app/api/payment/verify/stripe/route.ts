import { NextResponse } from 'next/server';
import { StripeProvider } from '@libs/payment/providers/stripe';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const stripeProvider = new StripeProvider();
    const verification = await stripeProvider.verifyCheckoutSession(sessionId);

    if (!verification.success) {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, orderId: verification.orderId });
  } catch (error) {
    console.error('Session verification failed:', error);
    return NextResponse.json({ error: 'Session verification failed' }, { status: 500 });
  }
}
