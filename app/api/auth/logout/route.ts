// /api/auth/logout/route.ts
// Phase 7: Admin logout — clears the admin-token HttpOnly cookie
// Phase 8: Added audit logging

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // Phase 8: Log logout event (fire-and-forget)
  logAudit(supabase, {
    adminIdentifier: 'admin',
    action: 'logout',
    resourceType: 'system',
    resourceDetails: { endpoint: '/api/auth/logout' },
    ipAddress: getClientIP(request.headers),
    userAgent: getUserAgent(request.headers),
  });

  const response = NextResponse.json({ success: true });
  response.cookies.delete({ name: 'admin-token', path: '/' });
  return response;
}
