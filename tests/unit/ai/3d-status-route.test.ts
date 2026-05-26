import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSessionMock = vi.fn();
const query3DTaskMock = vi.fn();
const isSupported3DModelMock = vi.fn();
const isSupported3DProviderMock = vi.fn();
const get3DGenerationRecordMock = vi.fn();
const mark3DGenerationFailedMock = vi.fn();
const mark3DGenerationRefundedMock = vi.fn();
const mark3DGenerationSucceededMock = vi.fn();
const addCreditsMock = vi.fn();

function createRequest(taskId = 'task_123') {
  return new Request(`http://localhost/api/3d-generate/status?taskId=${taskId}`);
}

function createFallbackRequest() {
  return new Request(
    'http://localhost/api/3d-generate/status?taskId=task_missing&provider=fal&model=fal-ai%2Fpixal3d&providerTaskId=fal-request-123'
  );
}

describe('Next Pixal3D status API route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getSessionMock.mockReset();
    query3DTaskMock.mockReset();
    isSupported3DModelMock.mockReset();
    isSupported3DProviderMock.mockReset();
    get3DGenerationRecordMock.mockReset();
    mark3DGenerationFailedMock.mockReset();
    mark3DGenerationRefundedMock.mockReset();
    mark3DGenerationSucceededMock.mockReset();
    addCreditsMock.mockReset();

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

    vi.doMock('@libs/ai/3d', () => ({
      isSupported3DModel: isSupported3DModelMock,
      isSupported3DProvider: isSupported3DProviderMock,
      query3DTask: query3DTaskMock,
    }));

    vi.doMock('@libs/ai/3d-task-store', () => ({
      get3DGenerationRecord: get3DGenerationRecordMock,
      mark3DGenerationFailed: mark3DGenerationFailedMock,
      mark3DGenerationRefunded: mark3DGenerationRefundedMock,
      mark3DGenerationSucceeded: mark3DGenerationSucceededMock,
    }));

    vi.doMock('@libs/credits', () => ({
      creditService: {
        addCredits: addCreditsMock,
      },
    }));
  });

  test('requires an authenticated user', async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import('../../../apps/next-app/app/api/3d-generate/status/route');
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: 'unauthorized' });
    expect(get3DGenerationRecordMock).not.toHaveBeenCalled();
    expect(query3DTaskMock).not.toHaveBeenCalled();
  });

  test('does not expose another user task', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_a' } });
    get3DGenerationRecordMock.mockReturnValue({
      id: 'task_123',
      userId: 'user_b',
      status: 'processing',
    });

    const { GET } = await import('../../../apps/next-app/app/api/3d-generate/status/route');
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({ error: 'not_found' });
    expect(query3DTaskMock).not.toHaveBeenCalled();
  });

  test('falls back to provider polling when the local task record is missing', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    get3DGenerationRecordMock.mockReturnValue(undefined);
    isSupported3DProviderMock.mockReturnValue(true);
    isSupported3DModelMock.mockReturnValue(true);
    query3DTaskMock.mockResolvedValue({
      status: 'succeeded',
      result: {
        modelUrl: 'https://v3b.fal.media/model.glb',
        format: 'glb',
        provider: 'fal',
        model: 'fal-ai/pixal3d',
      },
    });

    const { GET } = await import('../../../apps/next-app/app/api/3d-generate/status/route');
    const response = await GET(createFallbackRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(query3DTaskMock).toHaveBeenCalledWith('fal', 'fal-ai/pixal3d', 'fal-request-123');
    expect(body).toMatchObject({
      success: true,
      data: {
        id: 'task_missing',
        status: 'succeeded',
        result: {
          modelUrl: 'https://v3b.fal.media/model.glb',
        },
      },
    });
  });

  test('does not refund when provider polling returns a failure after execution started', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'user_123' } });
    const record = {
      id: 'task_123',
      userId: 'user_123',
      status: 'processing',
      provider: 'fal',
      model: 'fal-ai/pixal3d',
      providerTaskId: 'fal-request-123',
      creditCost: 20,
      consumeTransactionId: 'tx_123',
      refunded: false,
    };
    get3DGenerationRecordMock.mockReturnValue(record);
    query3DTaskMock.mockResolvedValue({
      status: 'failed',
      errorMessage: 'Provider failed',
    });
    mark3DGenerationFailedMock.mockReturnValue({
      ...record,
      status: 'failed',
      errorMessage: 'Provider failed',
    });

    const { GET } = await import('../../../apps/next-app/app/api/3d-generate/status/route');
    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: {
        status: 'failed',
        errorMessage: 'Provider failed',
      },
    });
    expect(addCreditsMock).not.toHaveBeenCalled();
    expect(mark3DGenerationRefundedMock).not.toHaveBeenCalled();
  });
});
