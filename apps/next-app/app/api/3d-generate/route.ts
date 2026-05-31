import { NextResponse } from 'next/server';
import {
  calculate3DCreditCost,
  create3DTask,
  isSupported3DModel,
  isSupported3DProvider,
  type ThreeDProviderName,
  type ThreeDQuality,
  type ThreeDResolution,
  type ThreeDTextureSize,
  type ThreeDDecimationTarget,
} from '@libs/ai/3d';
import {
  create3DGenerationRecord,
  mark3DGenerationFailed,
  mark3DGenerationProviderTask,
  mark3DGenerationRefunded,
} from '@libs/ai/3d-task-store';
import {
  check3DGenerationPlanLimit,
  get3DPlanEntitlement,
} from '@libs/ai/3d-entitlements';
import { auth } from '@libs/auth';
import { creditService, TransactionTypeCode } from '@libs/credits';
import { checkSubscriptionStatus } from '@libs/database/utils/subscription';
import { config } from '@config';

export const maxDuration = 60;

async function getOptionalUserId(req: Request): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers) });
    return session?.user?.id;
  } catch (error) {
    console.warn('3D generation session lookup failed; continuing as anonymous:', error);
    return undefined;
  }
}

function isSupportedImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|webp|bmp);base64,/i.test(value);
}

function readOptionalNumber(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getPersistedInputImageUrl(imageUrl: string): string {
  return /^https?:\/\//i.test(imageUrl) ? imageUrl : '';
}

async function refundConsumedCredits(input: {
  userId: string;
  creditCost: number;
  consumeTransactionId: string;
  provider: ThreeDProviderName;
  model?: string;
  error: unknown;
}) {
  if (input.creditCost <= 0) return;

  await creditService.addCredits({
    userId: input.userId,
    amount: input.creditCost,
    type: 'refund',
    description: 'Refund for failed 3D model generation',
    metadata: {
      originalTransactionId: input.consumeTransactionId,
      provider: input.provider,
      model: input.model || config.ai3d.defaultModels[input.provider],
      error: input.error instanceof Error ? input.error.message : 'Unknown error',
    },
  });
}

export async function POST(req: Request) {
  try {
    const userId = await getOptionalUserId(req);
    const body = await req.json() as Record<string, unknown>;
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const requestedProvider = typeof body.provider === 'string' ? body.provider : config.ai3d.defaultProvider;
    if (!isSupported3DProvider(requestedProvider)) {
      return NextResponse.json(
        { error: 'invalid_provider', message: 'Unsupported 3D generation provider.' },
        { status: 400 }
      );
    }

    const provider = requestedProvider as ThreeDProviderName;
    const model = typeof body.model === 'string' ? body.model : undefined;
    const quality = (body.quality || config.ai3d.defaults.quality) as ThreeDQuality;
    const resolution = body.resolution as ThreeDResolution | undefined;
    const textureSize = body.textureSize as ThreeDTextureSize | undefined;
    const effectiveResolution = resolution ?? config.ai3d.defaults.resolution;
    const effectiveTextureSize = textureSize ?? config.ai3d.defaults.textureSize;
    const decimationTarget = body.decimationTarget as ThreeDDecimationTarget | undefined;
    const seed = readOptionalNumber(body, 'seed');
    const meshScale = readOptionalNumber(body, 'meshScale');
    const remesh = typeof body.remesh === 'boolean' ? body.remesh : undefined;
    const maxNumTokens = readOptionalNumber(body, 'maxNumTokens');
    const sparseStructureSteps = readOptionalNumber(body, 'sparseStructureSteps');
    const sparseStructureGuidanceStrength = readOptionalNumber(body, 'sparseStructureGuidanceStrength');
    const sparseStructureGuidanceRescale = readOptionalNumber(body, 'sparseStructureGuidanceRescale');
    const sparseStructureRescaleT = readOptionalNumber(body, 'sparseStructureRescaleT');
    const shapeSteps = readOptionalNumber(body, 'shapeSteps');
    const shapeGuidanceStrength = readOptionalNumber(body, 'shapeGuidanceStrength');
    const shapeGuidanceRescale = readOptionalNumber(body, 'shapeGuidanceRescale');
    const shapeRescaleT = readOptionalNumber(body, 'shapeRescaleT');
    const textureSteps = readOptionalNumber(body, 'textureSteps');
    const textureGuidanceStrength = readOptionalNumber(body, 'textureGuidanceStrength');
    const textureGuidanceRescale = readOptionalNumber(body, 'textureGuidanceRescale');
    const textureRescaleT = readOptionalNumber(body, 'textureRescaleT');

    if (!imageUrl || !isSupportedImageUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'invalid_image', message: 'A valid image URL or image data URL is required.' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'invalid_prompt', message: 'Prompt is required.' },
        { status: 400 }
      );
    }

    if (model && !isSupported3DModel(provider, model)) {
      return NextResponse.json(
        { error: 'invalid_model', message: 'Unsupported 3D generation model.' },
        { status: 400 }
      );
    }

    const creditCost = calculate3DCreditCost({ provider, model, resolution });
    let consumeTransactionId: string | undefined;
    let remainingCredits: number | undefined;

    if (!userId) {
      return NextResponse.json(
        {
          error: 'sign_in_required',
          message: 'Sign in or upgrade to generate and save models.',
        },
        { status: 401 }
      );
    }

    const [balance, subscription] = await Promise.all([
      creditService.getBalance(userId),
      checkSubscriptionStatus(userId),
    ]);
    if (balance < creditCost) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          message: 'Not enough credits for 3D model generation.',
          required: creditCost,
          balance,
        },
        { status: 402 }
      );
    }

    const planLimit = check3DGenerationPlanLimit(
      get3DPlanEntitlement(subscription?.planId),
      { resolution: effectiveResolution, textureSize: effectiveTextureSize }
    );
    if (!planLimit.allowed) {
      return NextResponse.json(
        {
          error: 'plan_limit_exceeded',
          message: 'This generation setting is not available on your current plan.',
          reason: planLimit.reason,
          requiredTier: planLimit.requiredTier,
        },
        { status: 403 }
      );
    }

    const consumeResult = await creditService.consumeCredits({
      userId,
      amount: creditCost,
      description: TransactionTypeCode.AI_3D_GENERATION,
      metadata: {
        provider,
        model: model || config.ai3d.defaultModels[provider],
        prompt: prompt.substring(0, 100),
        quality,
        resolution,
        textureSize,
        decimationTarget,
        remesh,
      },
    });

    if (!consumeResult.success) {
      return NextResponse.json(
        {
          error: 'credit_consumption_failed',
          message: consumeResult.error || 'Failed to consume credits.',
          required: creditCost,
          balance: consumeResult.newBalance,
        },
        { status: 402 }
      );
    }

    consumeTransactionId = consumeResult.transactionId;
    remainingCredits = consumeResult.newBalance;

    let record;
    try {
      record = await create3DGenerationRecord({
        userId,
        inputImageUrl: getPersistedInputImageUrl(imageUrl),
        prompt,
        provider,
        model: model || config.ai3d.defaultModels[provider],
        providerTaskId: `pending_${crypto.randomUUID()}`,
        creditCost: userId ? creditCost : 0,
        resolution: effectiveResolution,
        textureSize: effectiveTextureSize,
        consumeTransactionId,
      });
    } catch (persistenceError) {
      if (consumeTransactionId && creditCost > 0) {
        try {
          await refundConsumedCredits({
            userId,
            creditCost,
            consumeTransactionId,
            provider,
            model,
            error: persistenceError,
          });
        } catch (refundError) {
          console.error('CRITICAL: Failed to refund credits after 3D history persistence failure:', {
            userId,
            amount: creditCost,
            originalTransactionId: consumeTransactionId,
            refundError,
          });
        }
      }

      throw new Error('Failed to save 3D generation history before provider submit.');
    }

    let task;
    try {
      task = await create3DTask({
        imageUrl,
        prompt,
        provider,
        model,
        quality,
        resolution,
        textureSize,
        decimationTarget,
        seed,
        meshScale,
        remesh,
        maxNumTokens,
        sparseStructureSteps,
        sparseStructureGuidanceStrength,
        sparseStructureGuidanceRescale,
        sparseStructureRescaleT,
        shapeSteps,
        shapeGuidanceStrength,
        shapeGuidanceRescale,
        shapeRescaleT,
        textureSteps,
        textureGuidanceStrength,
        textureGuidanceRescale,
        textureRescaleT,
      });
    } catch (taskError) {
      if (userId && consumeTransactionId && creditCost > 0) {
        try {
          await mark3DGenerationFailed(record.id, taskError instanceof Error ? taskError.message : '3D task creation failed.');
        } catch (markError) {
          console.error('Failed to mark 3D generation as failed after provider submit error:', {
            taskId: record.id,
            markError,
          });
        }
        try {
          await refundConsumedCredits({
            userId,
            creditCost,
            consumeTransactionId,
            provider,
            model,
            error: taskError,
          });
          await mark3DGenerationRefunded(record.id);
        } catch (refundError) {
          console.error('CRITICAL: Failed to refund credits after 3D task creation failure:', {
            userId,
            amount: creditCost,
            originalTransactionId: consumeTransactionId,
            refundError,
          });
        }
      }

      throw taskError;
    }
    const updatedRecord = await mark3DGenerationProviderTask(record.id, {
      provider: task.provider,
      model: task.model,
      providerTaskId: task.providerTaskId,
    });
    record = updatedRecord || {
      ...record,
      provider: task.provider,
      model: task.model,
      providerTaskId: task.providerTaskId,
    };

    const response = NextResponse.json({
      success: true,
      data: {
        taskId: record.id,
        status: record.status,
        provider: record.provider,
        model: record.model,
        providerTaskId: record.providerTaskId,
      },
      credits: userId
        ? { consumed: creditCost, remaining: remainingCredits }
        : undefined,
    });

    return response;
  } catch (error) {
    console.error('3D generation API error:', error);
    return NextResponse.json(
      {
        error: 'generation_failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred.',
      },
      { status: 500 }
    );
  }
}
