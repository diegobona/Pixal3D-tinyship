/**
 * AI 3D Generation Configuration
 * Provider is intentionally mock-only until the real image-to-3D provider is selected.
 */

export const ai3dConfig = {
  defaultProvider: 'mock' as const,
  defaultModels: {
    mock: 'pixal3d-mock-v1',
  },
  availableModels: {
    mock: ['pixal3d-mock-v1'],
  },
  qualityOptions: ['draft', 'standard', 'high'] as const,
  defaults: {
    quality: 'standard' as const,
  },
  mock: {
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    thumbnailUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.webp',
    processingDelayMs: 2500,
  },
} as const;

export type ThreeDProviderName = keyof typeof ai3dConfig.availableModels;
export type ThreeDQuality = typeof ai3dConfig.qualityOptions[number];
