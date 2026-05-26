import { describe, expect, test } from 'vitest';
import {
  check3DGenerationPlanLimit,
  get3DPlanEntitlement,
  getRequired3DTierForTextureSize,
} from '@libs/ai/3d-entitlements';

describe('Pixal3D plan entitlements', () => {
  test('limits Starter to 1024 resolution and 2048 texture size', () => {
    const entitlement = get3DPlanEntitlement('starterMonthly');

    expect(check3DGenerationPlanLimit(entitlement, {
      resolution: 1024,
      textureSize: 2048,
    })).toEqual({ allowed: true });
    expect(check3DGenerationPlanLimit(entitlement, {
      resolution: 1536,
      textureSize: 2048,
    })).toMatchObject({
      allowed: false,
      reason: 'resolution',
      requiredTier: 'creator',
    });
    expect(check3DGenerationPlanLimit(entitlement, {
      resolution: 1024,
      textureSize: 4096,
    })).toMatchObject({
      allowed: false,
      reason: 'textureSize',
      requiredTier: 'creator',
    });
  });

  test('allows Pro to use the 8192 texture option', () => {
    const entitlement = get3DPlanEntitlement('proYearly');

    expect(entitlement).toMatchObject({
      tier: 'pro',
      maxResolution: 1536,
      maxTextureSize: 8192,
    });
  });

  test('does not restrict settings when there is no active subscription entitlement', () => {
    expect(check3DGenerationPlanLimit(null, {
      resolution: 1536,
      textureSize: 4096,
    })).toEqual({ allowed: true });
  });

  test('maps visible provider texture options to the right upgrade tier', () => {
    expect(getRequired3DTierForTextureSize(1024)).toBe('free');
    expect(getRequired3DTierForTextureSize(2048)).toBe('starter');
    expect(getRequired3DTierForTextureSize(4096)).toBe('creator');
    expect(getRequired3DTierForTextureSize(8192)).toBe('pro');
  });
});
