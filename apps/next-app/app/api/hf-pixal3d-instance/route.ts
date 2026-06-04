import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash, randomUUID } from 'node:crypto';
import {
  getFreeTrialUsage,
  reserveFreeTrial,
  type FreeTrialIdentity,
} from '@libs/ai/free-trial-store';
import { selectLeastBusyHfPixal3DInstance } from '@libs/ai/hf-pixal3d-instance';
import { auth } from '@libs/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const FREE_TRIAL_COOKIE = 'pixal3d_free_trial';

async function getOptionalUserId(req: Request): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({ headers: new Headers(req.headers) });
    return session?.user?.id;
  } catch (error) {
    console.warn('Free trial session lookup failed; continuing as anonymous:', error);
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

async function getFreeTrialIdentity(req: Request): Promise<{
  identity: FreeTrialIdentity;
  trialToken?: string;
}> {
  const userId = await getOptionalUserId(req);
  if (userId) {
    return { identity: { userId } };
  }

  const cookieStore = await cookies();
  const trialToken = cookieStore.get(FREE_TRIAL_COOKIE)?.value || randomUUID();
  return {
    identity: {
      ipHash: hashIp(getClientIp(req)),
      trialToken,
    },
    trialToken,
  };
}

export async function GET(req: Request) {
  try {
    const { identity, trialToken } = await getFreeTrialIdentity(req);
    const usage = getFreeTrialUsage(identity);

    if (usage.remaining <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'free_trial_limit_reached',
          message: 'Free trials used. Sign in and subscribe to generate.',
          usage,
        },
        { status: 429 }
      );
    }

    const selection = await selectLeastBusyHfPixal3DInstance();

    if (!selection) {
      return NextResponse.json(
        {
          success: false,
          error: 'no_available_instance',
          message: 'Free trial server is busy, try again later',
        },
        { status: 503 }
      );
    }

    const reservation = reserveFreeTrial(identity);
    if (!reservation.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'free_trial_limit_reached',
          message: 'Free trials used. Sign in and subscribe to generate.',
          usage: reservation,
        },
        { status: 429 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        data: selection,
        usage: reservation,
      },
      {
        headers: {
          'cache-control': 'no-store',
        },
      }
    );

    if (trialToken) {
      response.cookies.set(FREE_TRIAL_COOKIE, trialToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error('HF Pixal3D instance resolver failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'instance_resolver_failed',
        message: 'Free trial server is busy, try again later',
      },
      { status: 503 }
    );
  }
}
