import { describe, expect, test, vi, beforeEach } from 'vitest';

describe('AI 3D generation abstraction', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('@config', () => ({
      config: {
        ai3d: {
          defaultProvider: 'mock',
          defaultModels: {
            mock: 'pixal3d-mock-v1',
          },
          mock: {
            modelUrl: 'https://example.com/model.glb',
            thumbnailUrl: 'https://example.com/model.png',
            processingDelayMs: 0,
          },
        },
        credits: {
          fixedConsumption: {
            ai3d: {
              default: 20,
              models: {
                'pixal3d-mock-v1': 3,
              },
            },
          },
        },
      },
    }));
  });

  test('creates and resolves a mock GLB task', async () => {
    const { create3DTask, query3DTask } = await import('@libs/ai/3d');

    const task = create3DTask({
      imageUrl: 'data:image/png;base64,abc',
      prompt: 'low-poly product render',
      provider: 'mock',
      model: 'pixal3d-mock-v1',
      quality: 'standard',
    });

    expect(task.provider).toBe('mock');
    expect(task.model).toBe('pixal3d-mock-v1');
    expect(task.providerTaskId).toMatch(/^mock_3d_/);

    const status = query3DTask(task.providerTaskId);
    expect(status.status).toBe('succeeded');
    expect(status.result).toEqual({
      modelUrl: 'https://example.com/model.glb',
      format: 'glb',
      provider: 'mock',
      model: 'pixal3d-mock-v1',
      thumbnailUrl: 'https://example.com/model.png',
    });
  });

  test('uses model-specific 3D credit cost when configured', async () => {
    const { calculate3DCreditCost } = await import('@libs/ai/3d');

    expect(calculate3DCreditCost({ provider: 'mock', model: 'pixal3d-mock-v1' })).toBe(3);
    expect(calculate3DCreditCost({ provider: 'mock', model: 'unknown-model' })).toBe(20);
  });
});
