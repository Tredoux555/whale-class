import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'unification-v1',
    routes: ['/parent/home', '/games', '/teacher']
  });
}
