import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 404 });
}
