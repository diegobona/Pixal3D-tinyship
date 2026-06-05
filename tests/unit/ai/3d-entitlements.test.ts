import { describe, expect, test } from 'vitest';
import { config } from '../../../config';
import {
  check3DGenerationPlanLimit,
  get3DPlanEntitlement,
  getRequired3DTierForTextureSize,
} from '@libs/ai/3d-entitlements';

describe('Pixal3D plan entitlements', () => {
  test('allows Starter to use the current hosted generation maximum', () => {
    const entitlement = get3DPlanEntitlement('starterMonthly');

    expect(check3DGenerationPlanLimit(entitlement, {
      resolution: 1536,
      textureSize: 4096,
    })).toEqual({ allowed: true });
    expect(entitlement).toMatchObject({
      tier: 'starter',
      maxResolution: 1536,
      maxTextureSize: 4096,
    });
  });

  test('keeps Creator and Pro capped at the current provider texture maximum', () => {
    const creatorEntitlement = get3DPlanEntitlement('creatorMonthly');
    const proEntitlement = get3DPlanEntitlement('proYearly');

    expect(creatorEntitlement).toMatchObject({
      tier: 'creator',
      maxResolution: 1536,
      maxTextureSize: 4096,
    });
    expect(proEntitlement).toMatchObject({
      tier: 'pro',
      maxResolution: 1536,
      maxTextureSize: 4096,
    });
  });

  test('does not restrict settings when there is no active subscription entitlement', () => {
    expect(check3DGenerationPlanLimit(null, {
      resolution: 1536,
      textureSize: 4096,
    })).toEqual({ allowed: true });
  });

  test('maps visible provider texture options to the right upgrade tier', () => {
    expect(config.ai3d.generationOptions.textureSizes).toEqual([1024, 2048, 4096]);
    expect(getRequired3DTierForTextureSize(1024)).toBe('free');
    expect(getRequired3DTierForTextureSize(2048)).toBe('starter');
    expect(getRequired3DTierForTextureSize(4096)).toBe('starter');
  });
});
