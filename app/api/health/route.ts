// /api/health/route.ts
// Simple health check endpoint for Railway
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    app: 'whale-montree'
  });
}
