import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, randomUUID } from 'node:crypto';
import {
  calculate3DCreditCost,
  create3DTask,
  type ThreeDProviderName,
  type ThreeDQuality,
} from '@libs/ai';
import {
  create3DGenerationRecord,
  reserveAnonymousTrial,
} from '@libs/ai/3d-task-store';
import { auth } from '@libs/auth';
import { creditService, TransactionTypeCode } from '@libs/credits';
import { config } from '@config';

export const maxDuration = 60;

const TRIAL_COOKIE = 'pixal3d_trial';

async function getOptionalUserId(req: Request): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers) });
    return session?.user?.id;
  } catch (error) {
    console.warn('3D generation session lookup failed; continuing as anonymous:', error);
    return undefined;
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function isSupportedImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^data:image\/(png|jpe?g|webp|bmp);base64,/i.test(value);
}

export async function POST(req: Request) {
  try {
    const userId = await getOptionalUserId(req);
    const body = await req.json();
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const provider = (body.provider || config.ai3d.defaultProvider) as ThreeDProviderName;
    const model = typeof body.model === 'string' ? body.model : undefined;
    const quality = (body.quality || config.ai3d.defaults.quality) as ThreeDQuality;

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

    let anonymousKey: string | undefined;
    let trialToken: string | undefined;
    const creditCost = calculate3DCreditCost({ provider, model });
    let consumeTransactionId: string | undefined;
    let remainingCredits: number | undefined;

    if (!userId) {
      const cookieStore = await cookies();
      const ipHash = hashIp(getClientIp(req));
      trialToken = cookieStore.get(TRIAL_COOKIE)?.value || randomUUID();
      anonymousKey = `${ipHash}:${trialToken}`;
      const trial = reserveAnonymousTrial({
        ipHash,
        trialToken,
      });

      if (!trial.allowed) {
        return NextResponse.json(
          {
            error: 'trial_used',
            message: 'Your free Pixal3D trial has already been used. Sign in to keep generating.',
          },
          { status: 403 }
        );
      }
    } else {
      const balance = await creditService.getBalance(userId);
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

      const consumeResult = await creditService.consumeCredits({
        userId,
        amount: creditCost,
        description: TransactionTypeCode.AI_3D_GENERATION,
        metadata: {
          provider,
          model: model || config.ai3d.defaultModels[provider],
          prompt: prompt.substring(0, 100),
          quality,
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
    }

    const task = create3DTask({ imageUrl, prompt, provider, model, quality });
    const record = create3DGenerationRecord({
      userId,
      anonymousKey,
      inputImageUrl: imageUrl,
      prompt,
      provider: task.provider,
      model: task.model,
      providerTaskId: task.providerTaskId,
      creditCost: userId ? creditCost : 0,
      consumeTransactionId,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        taskId: record.id,
        status: record.status,
        provider: record.provider,
        model: record.model,
      },
      credits: userId
        ? { consumed: creditCost, remaining: remainingCredits }
        : { trial: true },
    });

    if (!userId && trialToken) {
      response.cookies.set(TRIAL_COOKIE, trialToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

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
