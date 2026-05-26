import { beforeEach, describe, expect, test, vi } from 'vitest';

const getBalanceMock = vi.fn();
const consumeCreditsMock = vi.fn();
const addCreditsMock = vi.fn();
const getSessionMock = vi.fn();

function createRequest(body: unknown) {
  return new Request('http://localhost/api/3d-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Next Pixal3D generation API route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getBalanceMock.mockReset();
    consumeCreditsMock.mockReset();
    addCreditsMock.mockReset();
    getSessionMock.mockReset();

    vi.doMock('next/server', () => ({
      NextResponse: {
        json(data: unknown, init?: ResponseInit) {
          return Response.json(data, init);
        },
      },
    }));

    vi.doMock('@libs/auth', () => ({
      auth: {
        api: {
          getSession: getSessionMock,
        },
      },
    }));

    vi.doMock('@libs/credits', () => ({
      TransactionTypeCode: {
        AI_3D_GENERATION: 'ai_3d_generation',
      },
      creditService: {
        getBalance: getBalanceMock,
        consumeCredits: consumeCreditsMock,
        addCredits: addCreditsMock,
      },
    }));

    vi.doMock('@libs/ai/3d-task-store', () => ({
      create3DGenerationRecord(input: Record<string, unknown>) {
        return {
          ...input,
          id: 'task_3d_test',
          status: 'processing',
        };
      },
    }));

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
            mock: ['pixal3d-mock-v1'],
            fal: ['fal-ai/pixal3d'],
            wiro: ['tencentarc/pixal3d'],
          },
          defaults: {
            quality: 'standard',
            resolution: 1024,
            textureSize: 1024,
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
              default: 1100,
              models: {
                'fal-ai/pixal3d': 1100,
                'tencentarc/pixal3d': 1100,
                'pixal3d-mock-v1': 5,
              },
              modelResolutionCredits: {
                'fal-ai/pixal3d': {
                  1024: 1100,
                  1536: 1600,
                },
                'tencentarc/pixal3d': {
                  1024: 1100,
                  1536: 1600,
                },
              },
            },
          },
        },
      },
    }));
  });

  test('rejects unsupported providers before checking balance or consuming credits', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
      provider: 'unknown-provider',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_provider' });
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(addCreditsMock).not.toHaveBeenCalled();
  });

  test('rejects unsupported models before checking balance or consuming credits', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
      provider: 'fal',
      model: 'fal-ai/not-pixal3d',
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: 'invalid_model' });
    expect(getBalanceMock).not.toHaveBeenCalled();
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(addCreditsMock).not.toHaveBeenCalled();
  });

  test('refunds consumed credits when fal task creation fails before provider submit', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(2000);
    consumeCreditsMock.mockResolvedValue({
      success: true,
      transactionId: 'tx_123',
      newBalance: 900,
    });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: 'generation_failed',
      message: 'FAL_API_KEY or FAL_KEY is not configured.',
    });
    expect(consumeCreditsMock).toHaveBeenCalledOnce();
    expect(addCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_123',
      type: 'refund',
      amount: 1100,
      metadata: expect.objectContaining({
        originalTransactionId: 'tx_123',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        error: 'FAL_API_KEY or FAL_KEY is not configured.',
      }),
    }));
  });

  test('requires the resolution-specific credit balance before submit', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(1500);

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
      provider: 'fal',
      resolution: 1536,
    }));
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body).toMatchObject({
      error: 'insufficient_credits',
      required: 1600,
      balance: 1500,
    });
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(addCreditsMock).not.toHaveBeenCalled();
  });

  test('forwards Pixal3D generation settings to fal using API field names', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ request_id: 'fal_request_123' }, { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(3000);
    consumeCreditsMock.mockResolvedValue({
      success: true,
      transactionId: 'tx_123',
      newBalance: 1400,
    });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
      provider: 'fal',
      resolution: 1536,
      textureSize: 4096,
      decimationTarget: 150000,
      seed: 123,
      meshScale: 1.25,
      remesh: false,
      maxNumTokens: 32768,
      sparseStructureSteps: 14,
      sparseStructureGuidanceStrength: 8,
      sparseStructureGuidanceRescale: 0.6,
      sparseStructureRescaleT: 4,
      shapeSteps: 10,
      shapeGuidanceStrength: 7,
      shapeGuidanceRescale: 0.4,
      shapeRescaleT: 2,
      textureSteps: 16,
      textureGuidanceStrength: 1.2,
      textureGuidanceRescale: 0.5,
      textureRescaleT: 2.5,
    }));
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(response.status).toBe(200);
    expect(consumeCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1600,
      metadata: expect.objectContaining({
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        resolution: 1536,
        textureSize: 4096,
        decimationTarget: 150000,
        remesh: false,
      }),
    }));
    expect(requestBody).toMatchObject({
      image_url: 'https://example.com/input.png',
      resolution: 1536,
      texture_size: 4096,
      decimation_target: 150000,
      seed: 123,
      mesh_scale: 1.25,
      remesh: false,
      max_num_tokens: 32768,
      ss_sampling_steps: 14,
      ss_guidance_strength: 8,
      ss_guidance_rescale: 0.6,
      ss_rescale_t: 4,
      shape_slat_sampling_steps: 10,
      shape_slat_guidance_strength: 7,
      shape_slat_guidance_rescale: 0.4,
      shape_slat_rescale_t: 2,
      tex_slat_sampling_steps: 16,
      tex_slat_guidance_strength: 1.2,
      tex_slat_guidance_rescale: 0.5,
      tex_slat_rescale_t: 2.5,
    });
  });
});
