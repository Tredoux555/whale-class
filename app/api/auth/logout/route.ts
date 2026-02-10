// /api/auth/logout/route.ts
// Phase 7: Admin logout — clears the admin-token HttpOnly cookie

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'admin-token', path: '/' });
  return response;
}
