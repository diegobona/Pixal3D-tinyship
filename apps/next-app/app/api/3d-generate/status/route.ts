import { NextResponse } from 'next/server';
import { query3DTask } from '@libs/ai/3d';
import {
  get3DGenerationRecord,
  mark3DGenerationFailed,
  mark3DGenerationRefunded,
  mark3DGenerationSucceeded,
} from '@libs/ai/3d-task-store';
import { auth } from '@libs/auth';
import { creditService } from '@libs/credits';

async function refundIfNeeded(taskId: string) {
  const record = get3DGenerationRecord(taskId);
  if (!record?.userId || !record.consumeTransactionId || record.refunded || record.creditCost <= 0) {
    return;
  }

  await creditService.addCredits({
    userId: record.userId,
    amount: record.creditCost,
    type: 'refund',
    description: 'Refund for failed 3D model generation',
    metadata: {
      originalTransactionId: record.consumeTransactionId,
      provider: record.provider,
      model: record.model,
      taskId: record.id,
    },
  });
  mark3DGenerationRefunded(taskId);
}

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

    if (!record || record.userId !== userId) {
      return NextResponse.json(
        { error: 'not_found', message: '3D generation task was not found.' },
        { status: 404 }
      );
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
      await refundIfNeeded(taskId);
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
