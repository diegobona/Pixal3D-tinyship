import { describe, expect, test, beforeEach } from 'vitest';
import {
  FREE_TRIAL_LIMIT,
  getFreeTrialUsage,
  reserveFreeTrial,
  resetFreeTrialStore,
} from '@libs/ai/free-trial-store';

describe('Pixal3D free trial usage', () => {
  beforeEach(() => {
    resetFreeTrialStore();
  });

  test('allows exactly two free trials per anonymous browser and IP pair', () => {
    const input = { ipHash: 'ip-a', trialToken: 'browser-a' };

    expect(FREE_TRIAL_LIMIT).toBe(2);
    expect(reserveFreeTrial(input)).toMatchObject({ allowed: true, used: 1, remaining: 1 });
    expect(reserveFreeTrial(input)).toMatchObject({ allowed: true, used: 2, remaining: 0 });
    expect(reserveFreeTrial(input)).toMatchObject({ allowed: false, used: 2, remaining: 0, reason: 'trial_limit_reached' });
    expect(getFreeTrialUsage(input)).toEqual({ used: 2, remaining: 0, limit: 2 });
  });

  test('tracks logged-in users separately from anonymous visitors', () => {
    const anonymous = { ipHash: 'ip-a', trialToken: 'browser-a' };
    const signedIn = { userId: 'user-a' };

    reserveFreeTrial(anonymous);
    reserveFreeTrial(anonymous);

    expect(reserveFreeTrial(signedIn)).toMatchObject({ allowed: true, used: 1, remaining: 1 });
    expect(getFreeTrialUsage(signedIn)).toEqual({ used: 1, remaining: 1, limit: 2 });
  });
});
