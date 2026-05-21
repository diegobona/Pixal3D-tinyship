export interface PaymentParams {
  planId: string;
  userId: string;
  orderId: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  paymentUrl: string;
  providerOrderId: string;
  metadata?: Record<string, any>;
}

export interface PaymentPlan {
  id: string;
  amount: number;
  currency: string;
  duration: {
    type: 'recurring' | 'one_time' | 'credits';
    months?: number;
  };
  credits?: number;
  stripePriceId?: string;
  creemProductId?: string;
  paypalPlanId?: string;
}

export interface WebhookVerification {
  success: boolean;
  orderId?: string;
}

export interface PaymentProvider {
  createPayment(params: PaymentParams): Promise<PaymentResult>;
  handleWebhook(payload: string | Record<string, any>, signature: string): Promise<WebhookVerification>;
  closeOrder?(orderId: string): Promise<boolean>;
}

export interface OrderQueryResult {
  status: 'pending' | 'paid' | 'failed';
  metadata?: Record<string, any>;
}

export type StripeSubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid';
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';
