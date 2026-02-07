// /api/home/auth/register/route.ts
// Session 155: Deprecated — registration now handled by /api/home/auth/try
// Kept as stub to avoid 404 if old clients hit this endpoint

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Registration has moved. Use /api/home/auth/try instead.' },
    { status: 410 }
  );
}
