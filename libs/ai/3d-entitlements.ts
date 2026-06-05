import type { ThreeDResolution, ThreeDTextureSize } from '../../config/ai3d';

export type ThreeDPlanTier = 'free' | 'starter' | 'creator' | 'pro';

export interface ThreeDPlanEntitlement {
  tier: ThreeDPlanTier;
  label: string;
  maxResolution: ThreeDResolution;
  maxTextureSize: ThreeDTextureSize;
}

export interface ThreeDGenerationLimitCheck {
  allowed: boolean;
  requiredTier?: ThreeDPlanTier;
  reason?: 'resolution' | 'textureSize';
}

export const threeDPlanEntitlements: Record<ThreeDPlanTier, ThreeDPlanEntitlement> = {
  free: {
    tier: 'free',
    label: 'Free',
    maxResolution: 1024,
    maxTextureSize: 1024,
  },
  starter: {
    tier: 'starter',
    label: 'Starter',
    maxResolution: 1536,
    maxTextureSize: 4096,
  },
  creator: {
    tier: 'creator',
    label: 'Creator',
    maxResolution: 1536,
    maxTextureSize: 4096,
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    maxResolution: 1536,
    maxTextureSize: 4096,
  },
};

const planTierByPlanId: Record<string, ThreeDPlanTier> = {
  free: 'free',
  starterMonthly: 'starter',
  starterYearly: 'starter',
  creatorMonthly: 'creator',
  creatorYearly: 'creator',
  proMonthly: 'pro',
  proYearly: 'pro',
};

export function get3DPlanTier(planId?: string | null): ThreeDPlanTier | null {
  if (!planId) return null;
  return planTierByPlanId[planId] ?? null;
}

export function get3DPlanEntitlement(planId?: string | null): ThreeDPlanEntitlement | null {
  const tier = get3DPlanTier(planId);
  return tier ? threeDPlanEntitlements[tier] : null;
}

export function getRequired3DTierForResolution(resolution: ThreeDResolution): ThreeDPlanTier {
  return resolution <= 1024 ? 'free' : 'starter';
}

export function getRequired3DTierForTextureSize(textureSize: ThreeDTextureSize): ThreeDPlanTier {
  if (textureSize <= 1024) return 'free';
  return 'starter';
}

export function check3DGenerationPlanLimit(
  entitlement: ThreeDPlanEntitlement | null,
  input: {
    resolution: ThreeDResolution;
    textureSize: ThreeDTextureSize;
  }
): ThreeDGenerationLimitCheck {
  if (!entitlement) {
    return { allowed: true };
  }

  if (input.resolution > entitlement.maxResolution) {
    return {
      allowed: false,
      reason: 'resolution',
      requiredTier: getRequired3DTierForResolution(input.resolution),
    };
  }

  if (input.textureSize > entitlement.maxTextureSize) {
    return {
      allowed: false,
      reason: 'textureSize',
      requiredTier: getRequired3DTierForTextureSize(input.textureSize),
    };
  }

  return { allowed: true };
}
