import { config } from '@config';
import { resolveFixedConsumption } from '../../config/credits';
import type { ThreeDProviderName, ThreeDQuality } from '../../config/ai3d';

export type { ThreeDProviderName, ThreeDQuality } from '../../config/ai3d';

export type ThreeDGenerationStatus = 'processing' | 'succeeded' | 'failed';

export interface ThreeDGenerationOptions {
  imageUrl: string;
  prompt: string;
  provider?: ThreeDProviderName;
  model?: string;
  quality?: ThreeDQuality;
}

export interface ThreeDGenerationResult {
  modelUrl: string;
  format: 'glb';
  provider: ThreeDProviderName;
  model: string;
  thumbnailUrl?: string;
}

export interface ThreeDTask {
  provider: ThreeDProviderName;
  model: string;
  providerTaskId: string;
}

export interface ThreeDTaskStatus {
  status: ThreeDGenerationStatus;
  result?: ThreeDGenerationResult;
  errorMessage?: string;
}

interface MockTaskRecord {
  provider: ThreeDProviderName;
  model: string;
  createdAt: number;
}

const mockTasks = new Map<string, MockTaskRecord>();

function resolveProvider(provider?: ThreeDProviderName): ThreeDProviderName {
  return provider || config.ai3d.defaultProvider;
}

function resolveModel(provider: ThreeDProviderName, model?: string): string {
  return model || config.ai3d.defaultModels[provider];
}

function createMock3DTask(options: ThreeDGenerationOptions): ThreeDTask {
  const provider = resolveProvider(options.provider);
  const model = resolveModel(provider, options.model);
  const providerTaskId = `mock_3d_${crypto.randomUUID()}`;

  mockTasks.set(providerTaskId, {
    provider,
    model,
    createdAt: Date.now(),
  });

  return { provider, model, providerTaskId };
}

function queryMock3DTask(providerTaskId: string): ThreeDTaskStatus {
  const task = mockTasks.get(providerTaskId);
  if (!task) {
    return {
      status: 'failed',
      errorMessage: 'Mock 3D task was not found.',
    };
  }

  const elapsed = Date.now() - task.createdAt;
  if (elapsed < config.ai3d.mock.processingDelayMs) {
    return { status: 'processing' };
  }

  return {
    status: 'succeeded',
    result: {
      modelUrl: config.ai3d.mock.modelUrl,
      format: 'glb',
      provider: task.provider,
      model: task.model,
      thumbnailUrl: config.ai3d.mock.thumbnailUrl,
    },
  };
}

export function create3DTask(options: ThreeDGenerationOptions): ThreeDTask {
  const provider = resolveProvider(options.provider);

  if (provider !== 'mock') {
    throw new Error(`Unsupported 3D provider: ${provider}`);
  }

  if (!options.imageUrl.trim()) {
    throw new Error('Image URL is required for 3D generation.');
  }

  return createMock3DTask(options);
}

export function query3DTask(providerTaskId: string): ThreeDTaskStatus {
  return queryMock3DTask(providerTaskId);
}

export function calculate3DCreditCost(options: {
  provider?: ThreeDProviderName;
  model?: string;
}): number {
  const provider = resolveProvider(options.provider);
  const model = resolveModel(provider, options.model);
  return resolveFixedConsumption(config.credits.fixedConsumption.ai3d, model);
}
