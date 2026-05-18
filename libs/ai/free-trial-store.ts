export const FREE_TRIAL_LIMIT = 2;

export type FreeTrialIdentity =
  | { userId: string; ipHash?: never; trialToken?: never }
  | { userId?: never; ipHash: string; trialToken: string };

export interface FreeTrialUsage {
  used: number;
  remaining: number;
  limit: number;
}

export interface FreeTrialReservation extends FreeTrialUsage {
  allowed: boolean;
  reason?: 'trial_limit_reached';
}

const usageByIdentity = new Map<string, number>();

function getFreeTrialKey(identity: FreeTrialIdentity): string {
  if ('userId' in identity && identity.userId) {
    return `user:${identity.userId}`;
  }

  return `anon:${identity.ipHash}:${identity.trialToken}`;
}

function getUsageCount(identity: FreeTrialIdentity): number {
  return usageByIdentity.get(getFreeTrialKey(identity)) || 0;
}

export function getFreeTrialUsage(identity: FreeTrialIdentity): FreeTrialUsage {
  const used = Math.min(getUsageCount(identity), FREE_TRIAL_LIMIT);
  return {
    used,
    remaining: Math.max(0, FREE_TRIAL_LIMIT - used),
    limit: FREE_TRIAL_LIMIT,
  };
}

export function reserveFreeTrial(identity: FreeTrialIdentity): FreeTrialReservation {
  const key = getFreeTrialKey(identity);
  const current = Math.min(usageByIdentity.get(key) || 0, FREE_TRIAL_LIMIT);

  if (current >= FREE_TRIAL_LIMIT) {
    return {
      allowed: false,
      used: current,
      remaining: 0,
      limit: FREE_TRIAL_LIMIT,
      reason: 'trial_limit_reached',
    };
  }

  const used = current + 1;
  usageByIdentity.set(key, used);

  return {
    allowed: true,
    used,
    remaining: Math.max(0, FREE_TRIAL_LIMIT - used),
    limit: FREE_TRIAL_LIMIT,
  };
}

export function resetFreeTrialStore() {
  usageByIdentity.clear();
}
