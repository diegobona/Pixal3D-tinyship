import type { ThreeDResolution } from './ai3d';

export type FixedConsumptionConfig = number | {
  default: number;
  models?: Record<string, number>;
  modelResolutionCredits?: Record<string, Partial<Record<ThreeDResolution, number>>>;
};

export const creditsConfig = {
  fixedConsumption: {
    ai3d: {
      default: 1000,
      models: {
        'pixal3d-mock-v1': 5,
        'fal-ai/pixal3d': 1000,
        'tencentarc/pixal3d': 1000,
      },
      modelResolutionCredits: {
        'fal-ai/pixal3d': {
          1024: 1000,
          1536: 1500,
        },
        'tencentarc/pixal3d': {
          1024: 1000,
          1536: 1500,
        },
      },
    } as FixedConsumptionConfig,
  },
} as const;

export function resolveFixedConsumption(
  config: FixedConsumptionConfig,
  model?: string,
  resolution?: ThreeDResolution
): number {
  if (typeof config === 'number') {
    return config;
  }

  if (
    model &&
    resolution !== undefined &&
    config.modelResolutionCredits?.[model]?.[resolution] !== undefined
  ) {
    return config.modelResolutionCredits[model][resolution];
  }

  if (model && config.models?.[model] !== undefined) {
    return config.models[model];
  }

  return config.default;
}
