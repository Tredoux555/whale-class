import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error: unknown) {
    console.error('[Health] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
