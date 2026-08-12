// app/api/cms/health/route.ts
// Liveness probe. Deliberately says nothing about the database or env — a
// health endpoint that leaks configuration is a reconnaissance endpoint.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'cms', time: new Date().toISOString() });
}
