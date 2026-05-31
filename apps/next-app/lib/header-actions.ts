export function shouldShowHeaderUpgradeButton(input: {
  isAuthenticated: boolean;
  isCreditStatusLoaded: boolean;
  subscriptionPlanId?: string | null;
}) {
  return Boolean(input.isAuthenticated && input.isCreditStatusLoaded && !input.subscriptionPlanId);
}
