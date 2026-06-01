import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshYearlySubscriptionCreditsMock = vi.fn();

function createRequest(secret?: string) {
  return new Request('http://localhost/api/cron/refresh-yearly-credits', {
    method: 'POST',
    headers: secret ? { 'x-cron-secret': secret } : {},
  });
}

describe('Next yearly credits cron route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    refreshYearlySubscriptionCreditsMock.mockReset();

    vi.doMock('next/server', () => ({
      NextResponse: {
        json(data: unknown, init?: ResponseInit) {
          return Response.json(data, init);
        },
      },
    }));

    vi.doMock('@libs/payment/subscription-credit-refresh', () => ({
      refreshYearlySubscriptionCredits: refreshYearlySubscriptionCreditsMock,
    }));
  });

  it('rejects requests without the configured cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'secret_123');

    const { POST } = await import('../../../apps/next-app/app/api/cron/refresh-yearly-credits/route');
    const response = await POST(createRequest());

    expect(response.status).toBe(401);
    expect(refreshYearlySubscriptionCreditsMock).not.toHaveBeenCalled();
  });

  it('refreshes yearly credits when the cron secret matches', async () => {
    vi.stubEnv('CRON_SECRET', 'secret_123');
    refreshYearlySubscriptionCreditsMock.mockResolvedValue({
      checked: 2,
      granted: 1,
      skipped: 1,
      grants: [{ subscriptionId: 'sub_123', planId: 'starterYearly', amount: 15000, cycle: 1 }],
    });

    const { POST } = await import('../../../apps/next-app/app/api/cron/refresh-yearly-credits/route');
    const response = await POST(createRequest('secret_123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(refreshYearlySubscriptionCreditsMock).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      ok: true,
      result: {
        checked: 2,
        granted: 1,
        skipped: 1,
      },
    });
  });
});
