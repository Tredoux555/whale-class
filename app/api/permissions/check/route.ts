// =====================================================
// WHALE PLATFORM - PERMISSION CHECK API
// =====================================================
// Location: app/api/permissions/check/route.ts
// Purpose: API endpoint to check if user has specific permission
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId, checkPermission } from '@/lib/permissions/middleware';
import type { FeatureKey, PermissionLevel } from '@/lib/permissions/roles';
import { isFeatureKey, isPermissionLevel } from '@/lib/permissions/roles';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { hasAccess: false, reason: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { featureKey, permissionLevel = 'view' } = body;

    // Validate inputs
    if (!featureKey || !isFeatureKey(featureKey)) {
      return NextResponse.json(
        { hasAccess: false, reason: 'Invalid feature key' },
        { status: 400 }
      );
    }

    if (!isPermissionLevel(permissionLevel)) {
      return NextResponse.json(
        { hasAccess: false, reason: 'Invalid permission level' },
        { status: 400 }
      );
    }

    // Check permission
    const result = await checkPermission(userId, featureKey, permissionLevel);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json(
      { 
        hasAccess: false, 
        reason: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  });
}











