import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('yearly subscription credit refresh', () => {
  beforeEach(async () => {
    vi.resetModules();
    const { config } = await import('../../../config');

    vi.doMock('@config', () => ({ config }));
    vi.doMock('@libs/database', () => ({ db: {} }));
    vi.doMock('@libs/database/schema/credit-transaction', () => ({
      creditTransaction: {},
    }));
    vi.doMock('@libs/database/schema/subscription', () => ({
      paymentTypes: { RECURRING: 'recurring' },
      subscription: {},
      subscriptionStatus: { ACTIVE: 'active' },
    }));
    vi.doMock('@libs/credits', () => ({
      creditService: { addCredits: vi.fn() },
      TransactionTypeCode: { PURCHASE: 'purchase' },
    }));
  });

  it('returns the monthly cycles that are due after the first annual checkout month', async () => {
    const { getDueYearlyCreditGrantCycles } = await import('../../../libs/payment/subscription-credit-refresh');

    const periodStart = new Date('2026-01-15T00:00:00.000Z');
    const periodEnd = new Date('2027-01-15T00:00:00.000Z');

    expect(getDueYearlyCreditGrantCycles({
      periodStart,
      periodEnd,
      now: new Date('2026-02-14T23:59:59.000Z'),
      grantedCycles: [0],
    })).toEqual([]);

    expect(getDueYearlyCreditGrantCycles({
      periodStart,
      periodEnd,
      now: new Date('2026-02-15T00:00:00.000Z'),
      grantedCycles: [0],
    })).toEqual([1]);

    expect(getDueYearlyCreditGrantCycles({
      periodStart,
      periodEnd,
      now: new Date('2026-04-20T00:00:00.000Z'),
      grantedCycles: [0, 1],
    })).toEqual([2, 3]);
  });

  it('grants due yearly monthly credits once per cycle', async () => {
    const { refreshYearlySubscriptionCredits } = await import('../../../libs/payment/subscription-credit-refresh');
    const grantCredits = vi.fn().mockResolvedValue(undefined);

    const result = await refreshYearlySubscriptionCredits({
      now: new Date('2026-04-20T00:00:00.000Z'),
      findSubscriptions: async () => [{
        id: 'sub_row_1',
        userId: 'user_123',
        planId: 'starterYearly',
        stripeSubscriptionId: 'sub_stripe_123',
        periodStart: new Date('2026-01-15T00:00:00.000Z'),
        periodEnd: new Date('2027-01-15T00:00:00.000Z'),
      }],
      findGrantedCycles: async () => [0, 1],
      grantCredits,
    });

    expect(result).toMatchObject({
      checked: 1,
      granted: 2,
      skipped: 0,
    });
    expect(grantCredits).toHaveBeenCalledTimes(2);
    expect(grantCredits).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: 'user_123',
      planId: 'starterYearly',
      amount: 15000,
      subscriptionId: 'sub_stripe_123',
      cycle: 2,
      grantKey: 'sub_stripe_123:2',
    }));
    expect(grantCredits).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: 'user_123',
      planId: 'starterYearly',
      amount: 15000,
      subscriptionId: 'sub_stripe_123',
      cycle: 3,
      grantKey: 'sub_stripe_123:3',
    }));
  });
});
