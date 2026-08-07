// POST /api/potato/auth/logout — clears both Potato cookies.
// Deliberately clears teacher AND parent: a shared classroom iPad may hold
// either, and "log me out" must mean it.

import { NextResponse } from 'next/server';
import { clearPotatoCookies } from '@/lib/potato/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearPotatoCookies(response);
  return response;
}
