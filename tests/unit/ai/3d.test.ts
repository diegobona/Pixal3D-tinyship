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
            fal: 'fal-ai/pixal3d',
            wiro: 'tencentarc/pixal3d',
          },
          availableModels: {
            mock: ['pixal3d-mock-v1'],
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

    const task = await create3DTask({
      imageUrl: 'data:image/png;base64,abc',
      prompt: 'low-poly product render',
      provider: 'mock',
      model: 'pixal3d-mock-v1',
      quality: 'standard',
    });

    expect(task.provider).toBe('mock');
    expect(task.model).toBe('pixal3d-mock-v1');
    expect(task.providerTaskId).toMatch(/^mock_3d_/);

    const status = await query3DTask(task.providerTaskId);
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

  test('uses resolution-specific 3D credit cost when configured', async () => {
    vi.resetModules();
    vi.doMock('@config', () => ({
      config: {
        ai3d: {
          defaultProvider: 'fal',
          defaultModels: {
            mock: 'pixal3d-mock-v1',
            fal: 'fal-ai/pixal3d',
            wiro: 'tencentarc/pixal3d',
          },
          availableModels: {
            fal: ['fal-ai/pixal3d'],
          },
        },
        credits: {
          fixedConsumption: {
            ai3d: {
              default: 1100,
              models: {
                'fal-ai/pixal3d': 1100,
              },
              modelResolutionCredits: {
                'fal-ai/pixal3d': {
                  1024: 1100,
                  1536: 1600,
                },
              },
            },
          },
        },
      },
    }));

    const { calculate3DCreditCost } = await import('@libs/ai/3d');

    expect(calculate3DCreditCost({ provider: 'fal', resolution: 1024 })).toBe(1100);
    expect(calculate3DCreditCost({ provider: 'fal', resolution: 1536 })).toBe(1600);
  });

  test('validates configured 3D providers and models at runtime', async () => {
    const { isSupported3DModel, isSupported3DProvider } = await import('@libs/ai/3d');

    expect(isSupported3DProvider('mock')).toBe(true);
    expect(isSupported3DProvider('fal')).toBe(false);
    expect(isSupported3DProvider('not-a-provider')).toBe(false);
    expect(isSupported3DModel('mock', 'pixal3d-mock-v1')).toBe(true);
    expect(isSupported3DModel('mock', 'unknown-model')).toBe(false);
    expect(isSupported3DModel('not-a-provider', 'pixal3d-mock-v1')).toBe(false);
  });
});

describe('fal.ai Pixal3D provider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doMock('@config', () => ({
      config: {
        ai3d: {
          defaultProvider: 'fal',
          defaultModels: {
            mock: 'pixal3d-mock-v1',
            fal: 'fal-ai/pixal3d',
            wiro: 'tencentarc/pixal3d',
          },
          defaults: {
            resolution: 1024,
            textureSize: 2048,
            decimationTarget: 200000,
          },
          fal: {
            baseUrl: 'https://queue.fal.run',
            model: 'fal-ai/pixal3d',
          },
          wiro: {
            baseUrl: 'https://api.wiro.ai/v1',
            ownerSlug: 'tencentarc',
            modelSlug: 'pixal3d',
            pollingIntervalMs: 3000,
            maxTimeoutMs: 600000,
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
                'fal-ai/pixal3d': 20,
              },
            },
          },
        },
      },
    }));
  });

  test('starts Pixal3D through fal queue with documented JSON parameters', async () => {
    vi.stubEnv('FAL_API_KEY', 'test-fal-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      request_id: 'fal-request-123',
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { create3DTask } = await import('@libs/ai/3d');
    const task = await create3DTask({
      imageUrl: 'https://example.com/input.png',
      prompt: 'unused by Pixal3D',
      resolution: 1536,
      textureSize: 4096,
      decimationTarget: 300000,
      seed: 42,
      meshScale: 1.25,
      remesh: false,
      shapeSteps: 16,
      textureSteps: 20,
    });

    expect(task).toEqual({
      provider: 'fal',
      model: 'fal-ai/pixal3d',
      providerTaskId: 'fal-request-123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://queue.fal.run/fal-ai/pixal3d');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Key test-fal-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      image_url: 'https://example.com/input.png',
      resolution: 1536,
      texture_size: 4096,
      decimation_target: 300000,
      seed: 42,
      mesh_scale: 1.25,
      remesh: false,
      shape_slat_sampling_steps: 16,
      tex_slat_sampling_steps: 20,
    });
  });

  test('maps the 8192 UI texture option to the current fal 4096 texture payload', async () => {
    vi.stubEnv('FAL_API_KEY', 'test-fal-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      request_id: 'fal-request-8192',
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { create3DTask } = await import('@libs/ai/3d');
    await create3DTask({
      imageUrl: 'https://example.com/input.png',
      prompt: 'unused by Pixal3D',
      textureSize: 8192,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body as string)).toMatchObject({
      texture_size: 4096,
    });
  });

  test('accepts official FAL_KEY when FAL_API_KEY is not configured', async () => {
    vi.stubEnv('FAL_KEY', 'official-fal-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      request_id: 'fal-request-456',
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { create3DTask } = await import('@libs/ai/3d');
    await create3DTask({
      imageUrl: 'https://example.com/input.png',
      prompt: 'unused by Pixal3D',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).toMatchObject({
      Authorization: 'Key official-fal-key',
    });
  });

  test('maps completed fal queue result to a GLB result', async () => {
    vi.stubEnv('FAL_API_KEY', 'test-fal-key');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 'COMPLETED',
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        model_glb: {
          url: 'https://v3.fal.media/files/model.glb',
          content_type: 'model/gltf-binary',
          file_name: 'model.glb',
        },
        seed: 123,
      })));
    vi.stubGlobal('fetch', fetchMock);

    const { query3DTask } = await import('@libs/ai/3d');
    const status = await query3DTask('fal', 'fal-ai/pixal3d', 'fal-request-123');

    expect(status).toEqual({
      status: 'succeeded',
      result: {
        modelUrl: 'https://v3.fal.media/files/model.glb',
        format: 'glb',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
      },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://queue.fal.run/fal-ai/pixal3d/requests/fal-request-123/status',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Key test-fal-key' }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://queue.fal.run/fal-ai/pixal3d/requests/fal-request-123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Key test-fal-key' }),
      })
    );
  });

  test('treats completed fal status with provider error as failed', async () => {
    vi.stubEnv('FAL_API_KEY', 'test-fal-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: 'COMPLETED',
      error: 'Runner connection failed after connector refresh',
      error_type: 'runner_connection_error',
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { query3DTask } = await import('@libs/ai/3d');
    const status = await query3DTask('fal', 'fal-ai/pixal3d', 'fal-request-error');

    expect(status).toEqual({
      status: 'failed',
      errorMessage: 'Runner connection failed after connector refresh',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Wiro Pixal3D provider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doMock('@config', () => ({
      config: {
        ai3d: {
          defaultProvider: 'wiro',
          defaultModels: {
            mock: 'pixal3d-mock-v1',
            fal: 'fal-ai/pixal3d',
            wiro: 'tencentarc/pixal3d',
          },
          defaults: {
            resolution: 1024,
            textureSize: 2048,
            decimationTarget: 200000,
          },
          wiro: {
            baseUrl: 'https://api.wiro.ai/v1',
            ownerSlug: 'tencentarc',
            modelSlug: 'pixal3d',
            pollingIntervalMs: 3000,
            maxTimeoutMs: 600000,
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
                'tencentarc/pixal3d': 20,
              },
            },
          },
        },
      },
    }));
  });

  test('starts Pixal3D through Wiro with documented form parameters', async () => {
    vi.stubEnv('WIRO_API_KEY', 'test-wiro-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      result: true,
      errors: [],
      taskid: 'wiro-task-123',
      socketaccesstoken: 'socket-token-123',
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { create3DTask } = await import('@libs/ai/3d');
    const task = await create3DTask({
      imageUrl: 'https://example.com/input.png',
      prompt: 'unused by Pixal3D',
      provider: 'wiro',
      resolution: 1536,
      textureSize: 4096,
      decimationTarget: 300000,
      seed: 42,
    });

    expect(task).toEqual({
      provider: 'wiro',
      model: 'tencentarc/pixal3d',
      providerTaskId: 'wiro-task-123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.wiro.ai/v1/Run/tencentarc/pixal3d');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'x-api-key': 'test-wiro-key' });
    expect(init.body).toBeInstanceOf(FormData);

    const form = init.body as FormData;
    expect(form.get('inputImage')).toBe('https://example.com/input.png');
    expect(form.get('pipeline_type')).toBe('1536_cascade');
    expect(form.get('texture_size')).toBe('4096');
    expect(form.get('decimation_target')).toBe('300000');
    expect(form.get('seed')).toBe('42');
  });

  test('maps completed Wiro task detail output to a GLB result', async () => {
    vi.stubEnv('WIRO_API_KEY', 'test-wiro-key');

    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      result: true,
      errors: [],
      tasklist: [{
        status: 'task_postprocess_end',
        pexit: '0',
        outputs: [
          { name: 'preview.png', contenttype: 'image/png', url: 'https://cdn.example.com/preview.png' },
          { name: 'asset.glb', contenttype: 'model/gltf-binary', url: 'https://cdn.example.com/asset.glb' },
        ],
      }],
    })));
    vi.stubGlobal('fetch', fetchMock);

    const { query3DTask } = await import('@libs/ai/3d');
    const status = await query3DTask('wiro', 'tencentarc/pixal3d', 'wiro-task-123');

    expect(status).toEqual({
      status: 'succeeded',
      result: {
        modelUrl: 'https://cdn.example.com/asset.glb',
        format: 'glb',
        provider: 'wiro',
        model: 'tencentarc/pixal3d',
        thumbnailUrl: 'https://cdn.example.com/preview.png',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.wiro.ai/v1/Task/Detail',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'test-wiro-key',
        }),
        body: JSON.stringify({ taskid: 'wiro-task-123' }),
      })
    );
  });
});
