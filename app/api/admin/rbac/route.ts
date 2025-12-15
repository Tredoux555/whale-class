// =====================================================
// WHALE PLATFORM - ADMIN RBAC API ROUTES
// =====================================================
// Location: app/api/admin/rbac/route.ts
// Purpose: Admin endpoints for managing roles and permissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  grantPermission,
  revokePermission,
  getRolePermissionMatrix,
} from '@/lib/permissions/middleware';
import type { UserRole, FeatureKey, PermissionLevel } from '@/lib/permissions/roles';
import { isUserRole, isFeatureKey, isPermissionLevel } from '@/lib/permissions/roles';

// =====================================================
// GET ALL PERMISSIONS FOR A ROLE
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');

    if (!roleParam || !isUserRole(roleParam)) {
      return NextResponse.json(
        { error: 'Invalid role parameter' },
        { status: 400 }
      );
    }

    const permissions = await getRolePermissionMatrix(roleParam);

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Get role permissions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// UPDATE PERMISSION
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role_name, feature_key, permission_level, is_active, can_share_with_others } = body;

    // Validate inputs
    if (!isUserRole(role_name)) {
      return NextResponse.json({ error: 'Invalid role name' }, { status: 400 });
    }

    if (!isFeatureKey(feature_key)) {
      return NextResponse.json({ error: 'Invalid feature key' }, { status: 400 });
    }

    if (!isPermissionLevel(permission_level)) {
      return NextResponse.json({ error: 'Invalid permission level' }, { status: 400 });
    }

    // Use a dummy admin ID since we're using session-based auth
    // The permission functions need a userId but we don't have one with JWT auth
    // We'll need to pass 'admin' as the userId
    const adminUserId = 'admin-session';

    if (is_active) {
      // Grant permission
      await grantPermission(adminUserId, role_name, feature_key, permission_level, can_share_with_others || false);
    } else {
      // Revoke permission
      await revokePermission(adminUserId, role_name, feature_key, permission_level);
    }

    return NextResponse.json({ 
      success: true,
      message: is_active ? 'Permission granted' : 'Permission revoked'
    });
  } catch (error) {
    console.error('Update permission error:', error);
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
      'Allow': 'GET, PUT, OPTIONS',
    },
  });
}
