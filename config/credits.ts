export type FixedConsumptionConfig = number | {
  default: number;
  models?: Record<string, number>;
};

export const creditsConfig = {
  fixedConsumption: {
    ai3d: {
      default: 20,
      models: {
        'pixal3d-mock-v1': 5,
        'fal-ai/pixal3d': 20,
        'tencentarc/pixal3d': 20,
      },
    } as FixedConsumptionConfig,
  },
} as const;

export function resolveFixedConsumption(
  config: FixedConsumptionConfig,
  model?: string
): number {
  if (typeof config === 'number') {
    return config;
  }

  if (model && config.models?.[model] !== undefined) {
    return config.models[model];
  }

  return config.default;
}
