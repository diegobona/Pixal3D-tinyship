/**
 * AI 3D Generation Configuration
 * Providers: fal (primary Pixal3D API), wiro (backup), mock (local development)
 */

export const ai3dConfig = {
  defaultProvider: 'fal' as const,
  defaultModels: {
    mock: 'pixal3d-mock-v1',
    fal: 'fal-ai/pixal3d',
    wiro: 'tencentarc/pixal3d',
  },
  availableModels: {
    mock: ['pixal3d-mock-v1'],
    fal: ['fal-ai/pixal3d'],
    wiro: ['tencentarc/pixal3d'],
  },
  qualityOptions: ['draft', 'standard', 'high'] as const,
  generationOptions: {
    resolutions: [1024, 1536] as const,
    textureSizes: [1024, 2048, 4096, 8192] as const,
    decimationTargets: [100000, 150000, 200000, 300000] as const,
  },
  defaults: {
    quality: 'standard' as const,
    resolution: 1024 as const,
    textureSize: 2048 as const,
    decimationTarget: 200000 as const,
  },
  mock: {
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    thumbnailUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.webp',
    processingDelayMs: 2500,
  },
  fal: {
    baseUrl: 'https://queue.fal.run',
    model: 'fal-ai/pixal3d',
    pollingIntervalMs: 3000,
    maxTimeoutMs: 600000,
  },
  wiro: {
    baseUrl: 'https://api.wiro.ai/v1',
    ownerSlug: 'tencentarc',
    modelSlug: 'pixal3d',
    pollingIntervalMs: 3000,
    maxTimeoutMs: 600000,
  },
} as const;

export type ThreeDProviderName = keyof typeof ai3dConfig.availableModels;
export type ThreeDQuality = typeof ai3dConfig.qualityOptions[number];
export type ThreeDResolution =
  typeof ai3dConfig.generationOptions.resolutions[number];
export type ThreeDTextureSize =
  typeof ai3dConfig.generationOptions.textureSizes[number];
export type ThreeDDecimationTarget =
  typeof ai3dConfig.generationOptions.decimationTargets[number];
