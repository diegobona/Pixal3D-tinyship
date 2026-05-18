import { NextResponse } from 'next/server';
import { selectLeastBusyHfPixal3DInstance } from '@libs/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
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

    return NextResponse.json(
      {
        success: true,
        data: selection,
      },
      {
        headers: {
          'cache-control': 'no-store',
        },
      }
    );
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
