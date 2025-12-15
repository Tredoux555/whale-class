// =====================================================
// WHALE PLATFORM - GET USER PERMISSIONS API
// =====================================================
// Location: app/api/permissions/get-user-permissions/route.ts
// Purpose: API endpoint to get all permissions for current user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, getUserPermissions } from '@/lib/permissions/middleware';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user permissions
    const permissions = await getUserPermissions(userId);

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  });
}

