import { describe, expect, test } from 'vitest';
import { shouldShowHeaderUpgradeButton } from '../../../apps/next-app/lib/header-actions';

describe('shouldShowHeaderUpgradeButton', () => {
  test('does not show upgrade to signed-out users', () => {
    expect(shouldShowHeaderUpgradeButton({
      isAuthenticated: false,
      isCreditStatusLoaded: false,
      subscriptionPlanId: null,
    })).toBe(false);
  });

  test('shows upgrade to signed-in users without a subscription after credit status loads', () => {
    expect(shouldShowHeaderUpgradeButton({
      isAuthenticated: true,
      isCreditStatusLoaded: true,
      subscriptionPlanId: null,
    })).toBe(true);
  });
});
