import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    ping: 'pong',
    timestamp: new Date().toISOString(),
    deployed: true
  });
}


