import { beforeEach, describe, expect, test, vi } from 'vitest';

const getBalanceMock = vi.fn();
const consumeCreditsMock = vi.fn();
const addCreditsMock = vi.fn();
const getSessionMock = vi.fn();
const checkSubscriptionStatusMock = vi.fn();
const create3DGenerationRecordMock = vi.fn();
const mark3DGenerationFailedMock = vi.fn();
const mark3DGenerationProviderTaskMock = vi.fn();
const mark3DGenerationRefundedMock = vi.fn();

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
    checkSubscriptionStatusMock.mockReset();
    create3DGenerationRecordMock.mockReset();
    mark3DGenerationFailedMock.mockReset();
    mark3DGenerationProviderTaskMock.mockReset();
    mark3DGenerationRefundedMock.mockReset();
    create3DGenerationRecordMock.mockImplementation((input: Record<string, unknown>) => ({
      ...input,
      id: 'task_3d_test',
      status: 'processing',
    }));
    mark3DGenerationProviderTaskMock.mockImplementation((taskId: string, input: Record<string, unknown>) => ({
      id: taskId,
      ...input,
      status: 'processing',
    }));

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

    vi.doMock('@libs/database/utils/subscription', () => ({
      checkSubscriptionStatus: checkSubscriptionStatusMock,
    }));

    vi.doMock('@libs/ai/3d-task-store', () => ({
      create3DGenerationRecord: create3DGenerationRecordMock,
      mark3DGenerationFailed: mark3DGenerationFailedMock,
      mark3DGenerationProviderTask: mark3DGenerationProviderTaskMock,
      mark3DGenerationRefunded: mark3DGenerationRefundedMock,
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
              default: 1000,
              models: {
                'fal-ai/pixal3d': 1000,
                'tencentarc/pixal3d': 1000,
                'pixal3d-mock-v1': 5,
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
      amount: 1000,
      metadata: expect.objectContaining({
        originalTransactionId: 'tx_123',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        error: 'FAL_API_KEY or FAL_KEY is not configured.',
      }),
    }));
  });

  test('saves the generation record before submitting to fal', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ request_id: 'fal_request_123' }, { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(2000);
    consumeCreditsMock.mockResolvedValue({
      success: true,
      transactionId: 'tx_123',
      newBalance: 900,
    });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'data:image/png;base64,abc123',
      prompt: 'product render',
      provider: 'fal',
    }));

    expect(response.status).toBe(200);
    expect(create3DGenerationRecordMock).toHaveBeenCalledBefore(fetchMock);
    expect(create3DGenerationRecordMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_123',
      inputImageUrl: '',
      provider: 'fal',
      model: 'fal-ai/pixal3d',
      creditCost: 1000,
      consumeTransactionId: 'tx_123',
    }));
    expect(mark3DGenerationProviderTaskMock).toHaveBeenCalledWith(
      'task_3d_test',
      expect.objectContaining({
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        providerTaskId: 'fal_request_123',
      })
    );
  });

  test('refunds consumed credits and does not submit to fal when generation history cannot be saved', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    create3DGenerationRecordMock.mockRejectedValue(new Error('database unavailable'));
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
      provider: 'fal',
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: 'generation_failed',
      message: 'Failed to save 3D generation history before provider submit.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(addCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user_123',
      type: 'refund',
      amount: 1000,
      metadata: expect.objectContaining({
        originalTransactionId: 'tx_123',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        error: 'database unavailable',
      }),
    }));
  });

  test('requires the resolution-specific credit balance before submit', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(1400);

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
      required: 1500,
      balance: 1400,
    });
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(addCreditsMock).not.toHaveBeenCalled();
  });

  test('rejects generation settings above an active subscription plan limit before provider submit', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ request_id: 'fal_request_123' }, { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(3000);
    checkSubscriptionStatusMock.mockResolvedValue({ planId: 'starterMonthly' });
    consumeCreditsMock.mockResolvedValue({
      success: true,
      transactionId: 'tx_123',
      newBalance: 1900,
    });

    const { POST } = await import('../../../apps/next-app/app/api/3d-generate/route');
    const response = await POST(createRequest({
      imageUrl: 'https://example.com/input.png',
      prompt: 'product render',
      provider: 'fal',
      resolution: 1536,
      textureSize: 1024,
    }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      error: 'plan_limit_exceeded',
    });
    expect(consumeCreditsMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('allows all provider-supported settings when the user has credits but no active subscription', async () => {
    vi.stubEnv('FAL_API_KEY', 'test_fal_key');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ request_id: 'fal_request_123' }, { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    getBalanceMock.mockResolvedValue(3000);
    checkSubscriptionStatusMock.mockResolvedValue(null);
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
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(consumeCreditsMock).toHaveBeenCalledWith(expect.objectContaining({
      amount: 1500,
    }));
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
      amount: 1500,
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
