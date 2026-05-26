import { NextResponse } from 'next/server';
import {
  isSupported3DModel,
  isSupported3DProvider,
  query3DTask,
  type ThreeDProviderName,
} from '@libs/ai/3d';
import {
  get3DGenerationRecord,
  mark3DGenerationFailed,
  mark3DGenerationSucceeded,
} from '@libs/ai/3d-task-store';
import { auth } from '@libs/auth';

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers) });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId') || '';
    const record = get3DGenerationRecord(taskId);

    if (record && record.userId !== userId) {
      return NextResponse.json(
        { error: 'not_found', message: '3D generation task was not found.' },
        { status: 404 }
      );
    }

    if (!record) {
      const provider = searchParams.get('provider') || '';
      const model = searchParams.get('model') || '';
      const providerTaskId = searchParams.get('providerTaskId') || '';

      if (
        !providerTaskId ||
        !isSupported3DProvider(provider) ||
        !isSupported3DModel(provider as ThreeDProviderName, model)
      ) {
        return NextResponse.json(
          { error: 'not_found', message: '3D generation task was not found.' },
          { status: 404 }
        );
      }

      const status = await query3DTask(provider as ThreeDProviderName, model, providerTaskId);
      return NextResponse.json({
        success: true,
        data: {
          id: taskId,
          provider,
          model,
          providerTaskId,
          status: status.status,
          result: status.result,
          errorMessage: status.errorMessage,
        },
      });
    }

    if (record.status === 'succeeded' || record.status === 'failed') {
      return NextResponse.json({ success: true, data: record });
    }

    const status = await query3DTask(record.provider, record.model, record.providerTaskId);
    if (status.status === 'succeeded' && status.result) {
      const updated = mark3DGenerationSucceeded(taskId, status.result);
      return NextResponse.json({ success: true, data: updated });
    }

    if (status.status === 'failed') {
      const updated = mark3DGenerationFailed(taskId, status.errorMessage || '3D generation failed.');
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('3D generation status API error:', error);
    return NextResponse.json(
      {
        error: 'status_failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred.',
      },
      { status: 500 }
    );
  }
}
