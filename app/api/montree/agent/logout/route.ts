// /api/montree/agent/logout/route.ts
//
// Phase 7b — Agent logout. Clears the montree-auth cookie. Same pattern as
// teacher/principal logout but lives under /agent/* so the agent UI can
// call it without inferring the right path from role.

import { NextResponse } from 'next/server';
import { clearMontreeAuthCookie } from '@/lib/montree/server-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true, redirect: '/montree/login-select' });
  clearMontreeAuthCookie(response);
  return response;
}
