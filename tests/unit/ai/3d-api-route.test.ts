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
                'tencentarc/pixal3d': 20,
                'pixal3d-mock-v1': 5,
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
    getBalanceMock.mockResolvedValue(100);
    consumeCreditsMock.mockResolvedValue({
      success: true,
      transactionId: 'tx_123',
      newBalance: 80,
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
      amount: 20,
      type: 'refund',
      metadata: expect.objectContaining({
        originalTransactionId: 'tx_123',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
        error: 'FAL_API_KEY or FAL_KEY is not configured.',
      }),
    }));
  });
});
