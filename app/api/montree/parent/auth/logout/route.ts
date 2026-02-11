// /api/montree/parent/auth/logout/route.ts
// POST: Clear parent session cookie
// Phase 8: Added audit logging

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 8: Log logout event (fire-and-forget)
    logAudit(supabase, {
      adminIdentifier: 'parent',
      action: 'logout',
      resourceType: 'parent',
      resourceDetails: { endpoint: '/api/montree/parent/auth/logout' },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    const cookieStore = await cookies();
    cookieStore.delete('montree_parent_session');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed',
    }, { status: 500 });
  }
}
