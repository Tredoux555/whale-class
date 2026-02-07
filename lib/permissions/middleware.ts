// =====================================================
// WHALE PLATFORM - PERMISSION MIDDLEWARE
// =====================================================
// Location: lib/permissions/middleware.ts
// Purpose: Server-side permission checking and validation
// =====================================================

import { getSupabase } from '@/lib/supabase-client';
import { cookies } from 'next/headers';
import type {
  UserRole,
  PermissionLevel,
  FeatureKey,
  Permission,
  UserPermissions,
  PermissionCheckResult,
  FeaturePermissions,
} from './roles';
import { groupPermissionsByFeature } from './roles';

// =====================================================
// SUPABASE CLIENT HELPER
// =====================================================

/**
 * Get Supabase client for server-side operations
 * Uses service role key for admin operations
 */
export function getSupabaseClient() {
  return getSupabase(); // Uses getSupabase() from lib/supabase-client.ts which returns admin client
}

/**
 * Get Supabase client with user session (for RLS)
 * Uses auth-helpers-nextjs for compatibility
 */
export async function getSupabaseClientWithSession() {
  // For now, use the admin client since we're using service role key
  // In production, you may want to use @supabase/ssr for proper session handling
  return getSupabaseClient();
}

// =====================================================
// CORE PERMISSION FUNCTIONS
// =====================================================

/**
 * Get current user's ID from session
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getSupabaseClientWithSession();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user.id;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user's roles from database
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role_name')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return data?.map(row => row.role_name as UserRole) || [];
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const supabase = getSupabaseClient();

  // Get user roles
  const roles = await getUserRoles(userId);

  if (roles.length === 0) {
    return {
      user_id: userId,
      roles: [],
      permissions: [],
      features: [],
    };
  }

  // Get permissions for all user's roles
  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      feature_key,
      permission_level,
      can_share_with_others,
      features (
        feature_name,
        description,
        category
      )
    `)
    .in('role_name', roles)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching user permissions:', error);
    return {
      user_id: userId,
      roles,
      permissions: [],
      features: [],
    };
  }

  // Transform to Permission objects
  const permissions: Permission[] = (data || []).map((row: Record<string, unknown>) => ({
    feature_key: row.feature_key as FeatureKey,
    feature_name: ((row.features as Record<string, unknown>)?.feature_name as string) || '',
    permission_level: row.permission_level as PermissionLevel,
    can_share_with_others: row.can_share_with_others as boolean,
    category: ((row.features as Record<string, unknown>)?.category as string) || 'tools',
    description: ((row.features as Record<string, unknown>)?.description as string) || null,
  }));

  // Group by feature
  const features = groupPermissionsByFeature(permissions);

  return {
    user_id: userId,
    roles,
    permissions,
    features,
  };
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  userId: string,
  featureKey: FeatureKey,
  permissionLevel: PermissionLevel
): Promise<PermissionCheckResult> {
  const supabase = getSupabaseClient();

  // Get user roles
  const roles = await getUserRoles(userId);

  if (roles.length === 0) {
    return {
      hasAccess: false,
      reason: 'User has no assigned roles',
    };
  }

  // Check if user has the required permission
  const { data, error } = await supabase
    .from('role_permissions')
    .select('id')
    .in('role_name', roles)
    .eq('feature_key', featureKey)
    .eq('permission_level', permissionLevel)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('Error checking permission:', error);
    return {
      hasAccess: false,
      reason: 'Database error checking permissions',
    };
  }

  if (!data || data.length === 0) {
    return {
      hasAccess: false,
      reason: `Missing ${permissionLevel} permission for ${featureKey}`,
      requiredPermission: permissionLevel,
    };
  }

  // Log successful access
  await logPermissionAudit(userId, 'accessed', 'feature', null, {
    feature_key: featureKey,
    permission_level: permissionLevel,
  });

  return {
    hasAccess: true,
  };
}

/**
 * Check if user can access a feature (any permission level)
 */
export async function canAccessFeature(
  userId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const roles = await getUserRoles(userId);

  if (roles.length === 0) {
    return false;
  }

  const { data, error } = await supabase
    .from('role_permissions')
    .select('id')
    .in('role_name', roles)
    .eq('feature_key', featureKey)
    .eq('is_active', true)
    .limit(1);

  return !error && data && data.length > 0;
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some(role => role === 'admin' || role === 'super_admin');
}

/**
 * Check if user is teacher
 */
export async function isTeacher(userId: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes('teacher');
}

/**
 * Require admin access or throw error
 */
export async function requireAdmin(userId: string | null): Promise<string> {
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const isAdminUser = await isAdmin(userId);
  
  if (!isAdminUser) {
    await logPermissionAudit(userId, 'denied', 'permission', null, {
      required_role: 'admin',
      attempted_action: 'admin_access',
    });
    throw new Error('Admin access required');
  }

  return userId;
}

/**
 * Require specific permission or throw error
 */
export async function requirePermission(
  userId: string | null,
  featureKey: FeatureKey,
  permissionLevel: PermissionLevel
): Promise<string> {
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const result = await checkPermission(userId, featureKey, permissionLevel);
  
  if (!result.hasAccess) {
    await logPermissionAudit(userId, 'denied', 'feature', null, {
      feature_key: featureKey,
      permission_level: permissionLevel,
      reason: result.reason,
    });
    throw new Error(result.reason || 'Permission denied');
  }

  return userId;
}

// =====================================================
// STUDENT ACCESS CONTROL
// =====================================================

/**
 * Get teacher's assigned students
 */
export async function getTeacherStudents(teacherId: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('teacher_students')
    .select('student_id')
    .eq('teacher_id', teacherId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching teacher students:', error);
    return [];
  }

  return data?.map(row => row.student_id) || [];
}

/**
 * Check if teacher has access to a student
 */
export async function canAccessStudent(
  userId: string,
  studentId: string
): Promise<boolean> {
  // Admins can access all students
  if (await isAdmin(userId)) {
    return true;
  }

  // Teachers can access their assigned students
  if (await isTeacher(userId)) {
    const studentIds = await getTeacherStudents(userId);
    return studentIds.includes(studentId);
  }

  // Parents can access their own children (would need parent_children table)
  // For now, deny access
  return false;
}

/**
 * Require student access or throw error
 */
export async function requireStudentAccess(
  userId: string | null,
  studentId: string
): Promise<string> {
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const hasAccess = await canAccessStudent(userId, studentId);
  
  if (!hasAccess) {
    await logPermissionAudit(userId, 'denied', 'student', studentId, {
      attempted_access: 'student_data',
    });
    throw new Error('No access to this student');
  }

  return userId;
}

// =====================================================
// AUDIT LOGGING
// =====================================================

/**
 * Log permission audit event
 */
export async function logPermissionAudit(
  userId: string,
  action: 'granted' | 'revoked' | 'modified' | 'accessed' | 'denied',
  resourceType: 'feature' | 'role' | 'permission' | 'student',
  resourceId: string | null = null,
  details: Record<string, any> | null = null
): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    await supabase
      .from('permission_audit_log')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      });
  } catch (error) {
    // Don't throw on audit log failures
    console.error('Failed to log audit event:', error);
  }
}

// =====================================================
// PERMISSION MANAGEMENT (ADMIN ONLY)
// =====================================================

/**
 * Grant permission to a role
 */
export async function grantPermission(
  adminUserId: string,
  roleName: UserRole,
  featureKey: FeatureKey,
  permissionLevel: PermissionLevel,
  canShare: boolean = false
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('role_permissions')
    .upsert({
      role_name: roleName,
      feature_key: featureKey,
      permission_level: permissionLevel,
      can_share_with_others: canShare,
      is_active: true,
    }, {
      onConflict: 'role_name,feature_key,permission_level'
    });

  if (error) {
    console.error('Error granting permission:', error);
    throw new Error('Failed to grant permission');
  }

  await logPermissionAudit(adminUserId, 'granted', 'permission', null, {
    role_name: roleName,
    feature_key: featureKey,
    permission_level: permissionLevel,
  });
}

/**
 * Revoke permission from a role
 */
export async function revokePermission(
  adminUserId: string,
  roleName: UserRole,
  featureKey: FeatureKey,
  permissionLevel: PermissionLevel
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('role_permissions')
    .update({ is_active: false })
    .eq('role_name', roleName)
    .eq('feature_key', featureKey)
    .eq('permission_level', permissionLevel);

  if (error) {
    console.error('Error revoking permission:', error);
    throw new Error('Failed to revoke permission');
  }

  await logPermissionAudit(adminUserId, 'revoked', 'permission', null, {
    role_name: roleName,
    feature_key: featureKey,
    permission_level: permissionLevel,
  });
}

/**
 * Assign role to user
 */
export async function assignRole(
  adminUserId: string,
  targetUserId: string,
  roleName: UserRole
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: targetUserId,
      role_name: roleName,
    });

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      // Role already exists, that's okay
      return;
    }
    console.error('Error assigning role:', error);
    throw new Error('Failed to assign role');
  }

  await logPermissionAudit(adminUserId, 'granted', 'role', targetUserId, {
    role_name: roleName,
  });
}

/**
 * Remove role from user
 */
export async function removeRole(
  adminUserId: string,
  targetUserId: string,
  roleName: UserRole
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', targetUserId)
    .eq('role_name', roleName);

  if (error) {
    console.error('Error removing role:', error);
    throw new Error('Failed to remove role');
  }

  await logPermissionAudit(adminUserId, 'revoked', 'role', targetUserId, {
    role_name: roleName,
  });
}

/**
 * Assign student to teacher
 */
export async function assignStudentToTeacher(
  adminUserId: string,
  teacherId: string,
  studentId: string,
  notes: string | null = null
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('teacher_students')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      notes,
      is_active: true,
    });

  if (error) {
    if (error.code === '23505') { // Already assigned
      return;
    }
    console.error('Error assigning student:', error);
    throw new Error('Failed to assign student');
  }

  await logPermissionAudit(adminUserId, 'granted', 'student', studentId, {
    teacher_id: teacherId,
    notes,
  });
}

/**
 * Remove student from teacher
 */
export async function removeStudentFromTeacher(
  adminUserId: string,
  teacherId: string,
  studentId: string
): Promise<void> {
  await requireAdmin(adminUserId);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('teacher_students')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error removing student assignment:', error);
    throw new Error('Failed to remove student assignment');
  }

  await logPermissionAudit(adminUserId, 'revoked', 'student', studentId, {
    teacher_id: teacherId,
  });
}

// =====================================================
// QUERY HELPERS
// =====================================================

/**
 * Get all features with their permissions for a role
 */
export async function getRolePermissionMatrix(
  roleName: UserRole
): Promise<FeaturePermissions[]> {
  const supabase = getSupabaseClient();

  // Get all features
  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('*')
    .eq('is_active', true);

  if (featuresError || !features) {
    console.error('Error fetching features:', featuresError);
    return [];
  }

  // Get permissions for this role
  const { data: permissions, error: permissionsError } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role_name', roleName)
    .eq('is_active', true);

  if (permissionsError) {
    console.error('Error fetching role permissions:', permissionsError);
    return [];
  }

  // Build permission matrix
  return features.map(feature => {
    const featurePerms = permissions?.filter(p => p.feature_key === feature.feature_key) || [];
    
    return {
      feature_key: feature.feature_key as FeatureKey,
      feature_name: feature.feature_name,
      description: feature.description,
      category: feature.category,
      permissions: {
        view: featurePerms.some(p => p.permission_level === 'view'),
        edit: featurePerms.some(p => p.permission_level === 'edit'),
        create: featurePerms.some(p => p.permission_level === 'create'),
        delete: featurePerms.some(p => p.permission_level === 'delete'),
      },
      can_share: featurePerms.some(p => p.can_share_with_others),
    };
  });
}

/**
 * Get all teachers with their permissions summary
 */
export async function getAllTeachers() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, role_name, created_at')
    .eq('role_name', 'teacher');

  if (error) {
    console.error('Error fetching teachers:', error);
    return [];
  }

  return data || [];
}

// =====================================================
// CACHING (Optional - implement if needed)
// =====================================================

// Cache user permissions for 5 minutes to reduce database queries
const permissionCache = new Map<string, { data: UserPermissions; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user permissions with caching
 */
export async function getUserPermissionsCached(userId: string): Promise<UserPermissions> {
  const now = Date.now();
  const cached = permissionCache.get(userId);

  if (cached && cached.expires > now) {
    return cached.data;
  }

  const permissions = await getUserPermissions(userId);
  permissionCache.set(userId, {
    data: permissions,
    expires: now + CACHE_TTL,
  });

  return permissions;
}

/**
 * Clear permission cache for a user
 */
export function clearPermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

/**
 * Clear all permission caches
 */
export function clearAllPermissionCaches(): void {
  permissionCache.clear();
}

