// /api/montree/auth/logout/route.ts
// Clears the montree-auth httpOnly cookie (teacher/principal logout)

import { NextResponse } from 'next/server';
import { clearMontreeAuthCookie } from '@/lib/montree/server-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearMontreeAuthCookie(response);
  return response;
}
