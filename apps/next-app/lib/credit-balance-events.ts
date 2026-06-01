export const CREDIT_BALANCE_UPDATED_EVENT = "tinyship:credit-balance-updated";

interface CreditBalanceUpdatedDetail {
  balance: number;
  subscriptionPlanId?: string | null;
}

export function dispatchCreditBalanceUpdated(balance: number, target: EventTarget = window) {
  dispatchCreditStatusUpdated({ balance }, target);
}

export function dispatchCreditStatusUpdated(
  detail: CreditBalanceUpdatedDetail,
  target: EventTarget = window
) {
  target.dispatchEvent(
    new CustomEvent<CreditBalanceUpdatedDetail>(CREDIT_BALANCE_UPDATED_EVENT, {
      detail,
    })
  );
}

export function getCreditBalanceFromEvent(event: Event): number | null {
  if (!(event instanceof CustomEvent)) return null;

  const balance = Number((event.detail as Partial<CreditBalanceUpdatedDetail> | undefined)?.balance);
  return Number.isFinite(balance) ? balance : null;
}

export function getSubscriptionPlanIdFromEvent(event: Event): string | null | undefined {
  if (!(event instanceof CustomEvent)) return undefined;

  const detail = event.detail as Partial<CreditBalanceUpdatedDetail> | undefined;
  if (!detail || !("subscriptionPlanId" in detail)) return undefined;

  return typeof detail.subscriptionPlanId === "string" ? detail.subscriptionPlanId : null;
}
