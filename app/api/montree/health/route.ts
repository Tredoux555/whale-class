// app/api/montree/health/route.ts
// Lightweight health check endpoint used by offline sync to verify network connectivity
// No auth required — just confirms the server is reachable

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
