import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 404 });
}
