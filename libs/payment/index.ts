import { StripeProvider } from './providers/stripe';

export type PaymentProviderType = 'stripe';

/**
 * Create payment provider instance
 * @param provider Payment provider type
 * @returns Payment provider instance
 */
export function createPaymentProvider(provider: PaymentProviderType): StripeProvider {
  if (provider !== 'stripe') {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }

  return new StripeProvider();
}

// Pixal3D v1 only ships Stripe checkout.
export * from './types';
export * from './subscription-credit-refresh';
export { StripeProvider };
