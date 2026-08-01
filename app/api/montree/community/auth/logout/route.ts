// /api/montree/community/auth/logout
// Clears the Teachers' Room cookie. No body, no rate limit, always succeeds —
// there is nothing here worth failing on, and a logout that can error is a
// logout a user can get stuck inside.
import { NextResponse } from 'next/server';
import { clearCommunityCookie } from '@/lib/montree/community/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCommunityCookie(response);
  return response;
}
