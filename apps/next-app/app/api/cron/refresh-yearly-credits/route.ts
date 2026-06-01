import { NextResponse } from 'next/server';
import { refreshYearlySubscriptionCredits } from '@libs/payment/subscription-credit-refresh';

export const dynamic = 'force-dynamic';

function getRequestSecret(request: Request): string {
  const headerSecret = request.headers.get('x-cron-secret');
  if (headerSecret) {
    return headerSecret;
  }

  const authorization = request.headers.get('authorization') || '';
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice('bearer '.length).trim()
    : '';
}

export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'cron_secret_not_configured' },
      { status: 503 }
    );
  }

  if (getRequestSecret(request) !== expectedSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await refreshYearlySubscriptionCredits();

  return NextResponse.json({
    ok: true,
    result,
  });
}
