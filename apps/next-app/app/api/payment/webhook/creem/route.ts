import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 404 });
}
