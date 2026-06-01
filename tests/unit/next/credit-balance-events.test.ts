import { describe, expect, test } from 'vitest';
import {
  CREDIT_BALANCE_UPDATED_EVENT,
  dispatchCreditBalanceUpdated,
  dispatchCreditStatusUpdated,
  getCreditBalanceFromEvent,
  getSubscriptionPlanIdFromEvent,
} from '../../../apps/next-app/lib/credit-balance-events';

describe('credit balance events', () => {
  test('dispatches the latest credit balance to browser listeners', () => {
    const target = new EventTarget();
    let nextBalance: number | null = null;

    target.addEventListener(CREDIT_BALANCE_UPDATED_EVENT, (event) => {
      nextBalance = getCreditBalanceFromEvent(event);
    });

    dispatchCreditBalanceUpdated(3900, target);

    expect(nextBalance).toBe(3900);
  });

  test('dispatches subscription plan changes with credit status updates', () => {
    const target = new EventTarget();
    let nextBalance: number | null = null;
    let nextPlanId: string | null | undefined;

    target.addEventListener(CREDIT_BALANCE_UPDATED_EVENT, (event) => {
      nextBalance = getCreditBalanceFromEvent(event);
      nextPlanId = getSubscriptionPlanIdFromEvent(event);
    });

    dispatchCreditStatusUpdated({ balance: 10000, subscriptionPlanId: 'starter' }, target);

    expect(nextBalance).toBe(10000);
    expect(nextPlanId).toBe('starter');
  });
});
