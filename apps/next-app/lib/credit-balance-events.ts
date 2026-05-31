export const CREDIT_BALANCE_UPDATED_EVENT = "tinyship:credit-balance-updated";

interface CreditBalanceUpdatedDetail {
  balance: number;
}

export function dispatchCreditBalanceUpdated(balance: number, target: EventTarget = window) {
  target.dispatchEvent(
    new CustomEvent<CreditBalanceUpdatedDetail>(CREDIT_BALANCE_UPDATED_EVENT, {
      detail: { balance },
    })
  );
}

export function getCreditBalanceFromEvent(event: Event): number | null {
  if (!(event instanceof CustomEvent)) return null;

  const balance = Number((event.detail as Partial<CreditBalanceUpdatedDetail> | undefined)?.balance);
  return Number.isFinite(balance) ? balance : null;
}
