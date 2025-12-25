// =====================================================
// WHALE PLATFORM - RBAC TYPE DEFINITIONS
// =====================================================
// Location: lib/permissions/roles.ts
// Purpose: TypeScript types for role-based access control
// =====================================================

/**
 * Available user roles in the system
 */
export type UserRole = 'admin' | 'teacher' | 'parent' | 'super_admin';

/**
 * Permission levels for features
 */
export type PermissionLevel = 'view' | 'edit' | 'create' | 'delete';

/**
 * Feature keys for all available features
 */
export type FeatureKey = 
  | 'three_part_card_generator'
  | 'curriculum_viewer'
  | 'progress_dashboard'
  | 'activity_management'
  | 'report_generation'
  | 'resource_library'
  | 'lesson_planner'
  | 'student_management';

/**
 * Feature categories
 */
export type FeatureCategory = 'tools' | 'curriculum' | 'assessment' | 'admin';

/**
 * Audit log actions
 */
export type AuditAction = 'granted' | 'revoked' | 'modified' | 'accessed' | 'denied';

/**
 * Audit resource types
 */
export type AuditResourceType = 'feature' | 'role' | 'permission' | 'student';

// =====================================================
// DATABASE TABLE INTERFACES
// =====================================================

/**
 * User role record from database
 */
export interface UserRoleRecord {
  id: string;
  user_id: string;
  role_name: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Feature record from database
 */
export interface FeatureRecord {
  id: string;
  feature_key: FeatureKey;
  feature_name: string;
  description: string | null;
  category: FeatureCategory;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Role permission record from database
 */
export interface RolePermissionRecord {
  id: string;
  role_name: UserRole;
  feature_key: FeatureKey;
  permission_level: PermissionLevel;
  can_share_with_others: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Teacher-student relationship from database
 */
export interface TeacherStudentRecord {
  id: string;
  teacher_id: string;
  student_id: string;
  assigned_at: string;
  notes: string | null;
  is_active: boolean;
}

/**
 * Permission audit log record
 */
export interface PermissionAuditLogRecord {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =====================================================
// APPLICATION INTERFACES
// =====================================================

/**
 * Single permission with feature details
 */
export interface Permission {
  feature_key: FeatureKey;
  feature_name: string;
  permission_level: PermissionLevel;
  can_share_with_others: boolean;
  category: FeatureCategory;
  description: string | null;
}

/**
 * Grouped permissions by feature
 */
export interface FeaturePermissions {
  feature_key: FeatureKey;
  feature_name: string;
  description: string | null;
  category: FeatureCategory;
  permissions: {
    view: boolean;
    edit: boolean;
    create: boolean;
    delete: boolean;
  };
  can_share: boolean;
}

/**
 * Complete user permissions with roles
 */
export interface UserPermissions {
  user_id: string;
  roles: UserRole[];
  permissions: Permission[];
  features: FeaturePermissions[];
}

/**
 * Teacher with their students
 */
export interface TeacherWithStudents {
  teacher_id: string;
  teacher_email: string;
  teacher_name: string | null;
  roles: UserRole[];
  students: {
    student_id: string;
    student_name: string;
    assigned_at: string;
    notes: string | null;
    is_active: boolean;
  }[];
  active_student_count: number;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermission?: PermissionLevel;
}

/**
 * Permission update request
 */
export interface PermissionUpdateRequest {
  role_name: UserRole;
  feature_key: FeatureKey;
  permission_level: PermissionLevel;
  is_active: boolean;
  can_share_with_others?: boolean;
}

/**
 * Teacher registration data
 */
export interface TeacherRegistrationData {
  email: string;
  name?: string;
  role_name?: UserRole;
  auto_assign_students?: boolean;
}

/**
 * Student assignment data
 */
export interface StudentAssignmentData {
  teacher_id: string;
  student_id: string;
  notes?: string;
}

// =====================================================
// PERMISSION CONSTANTS
// =====================================================

/**
 * All available roles
 */
export const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'teacher', 'parent'];

/**
 * All permission levels
 */
export const ALL_PERMISSION_LEVELS: PermissionLevel[] = ['view', 'edit', 'create', 'delete'];

/**
 * All feature keys
 */
export const ALL_FEATURES: FeatureKey[] = [
  'three_part_card_generator',
  'curriculum_viewer',
  'progress_dashboard',
  'activity_management',
  'report_generation',
  'resource_library',
  'lesson_planner',
  'student_management',
];

/**
 * Feature display names
 */
export const FEATURE_NAMES: Record<FeatureKey, string> = {
  three_part_card_generator: 'Three-Part Card Generator',
  curriculum_viewer: 'Curriculum Viewer',
  progress_dashboard: 'Progress Dashboard',
  activity_management: 'Activity Management',
  report_generation: 'Report Generation',
  resource_library: 'Resource Library',
  lesson_planner: 'Lesson Planner',
  student_management: 'Student Management',
};

/**
 * Feature descriptions
 */
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  three_part_card_generator: 'Generate custom Montessori three-part cards with images and labels',
  curriculum_viewer: 'View the complete Montessori curriculum roadmap and learning progressions',
  progress_dashboard: 'Track and visualize student progress across all activities',
  activity_management: 'Create, edit, and manage student activities and learning records',
  report_generation: 'Generate detailed progress reports for parents and administrators',
  resource_library: 'Access and share educational resources, materials, and templates',
  lesson_planner: 'Plan and schedule lessons with curriculum alignment',
  student_management: 'Manage student profiles, enrollment, and basic information',
};

/**
 * Feature categories
 */
export const FEATURE_CATEGORIES: Record<FeatureCategory, string> = {
  tools: 'Educational Tools',
  curriculum: 'Curriculum & Planning',
  assessment: 'Assessment & Reporting',
  admin: 'Administration',
};

/**
 * Role display names
 */
export const ROLE_NAMES: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  admin: 'Administrator',
  teacher: 'Teacher',
  parent: 'Parent',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full system access with ability to manage all roles and permissions',
  admin: 'Administrative access to manage teachers, students, and most features',
  teacher: 'Access to teaching tools, curriculum, and assigned student data',
  parent: 'Limited access to view their child\'s activities and progress',
};

/**
 * Permission level display names
 */
export const PERMISSION_NAMES: Record<PermissionLevel, string> = {
  view: 'View',
  edit: 'Edit',
  create: 'Create',
  delete: 'Delete',
};

/**
 * Permission level descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  view: 'Can view and read data',
  edit: 'Can modify existing data',
  create: 'Can create new items',
  delete: 'Can remove items',
};

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Permission matrix for UI display
 */
export interface PermissionMatrix {
  role: UserRole;
  features: {
    feature_key: FeatureKey;
    feature_name: string;
    category: FeatureCategory;
    permissions: {
      view: boolean;
      edit: boolean;
      create: boolean;
      delete: boolean;
    };
  }[];
}

/**
 * Feature with all roles' permissions
 */
export interface FeatureWithRolePermissions {
  feature: FeatureRecord;
  rolePermissions: {
    role: UserRole;
    permissions: {
      view: boolean;
      edit: boolean;
      create: boolean;
      delete: boolean;
    };
  }[];
}

/**
 * Audit log entry with user details
 */
export interface AuditLogEntry extends PermissionAuditLogRecord {
  user_email: string;
  user_name: string | null;
}

/**
 * Teacher summary for admin panel
 */
export interface TeacherSummary {
  id: string;
  email: string;
  name: string | null;
  roles: UserRole[];
  student_count: number;
  active_features: number;
  created_at: string;
  last_login: string | null;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Check if a string is a valid user role
 */
export function isUserRole(value: string): value is UserRole {
  return ALL_ROLES.includes(value as UserRole);
}

/**
 * Check if a string is a valid permission level
 */
export function isPermissionLevel(value: string): value is PermissionLevel {
  return ALL_PERMISSION_LEVELS.includes(value as PermissionLevel);
}

/**
 * Check if a string is a valid feature key
 */
export function isFeatureKey(value: string): value is FeatureKey {
  return ALL_FEATURES.includes(value as FeatureKey);
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(roles: UserRole[]): boolean {
  return roles.some(role => role === 'admin' || role === 'super_admin');
}

/**
 * Check if user is a teacher
 */
export function isTeacher(roles: UserRole[]): boolean {
  return roles.includes('teacher');
}

/**
 * Check if user is a parent
 */
export function isParent(roles: UserRole[]): boolean {
  return roles.includes('parent');
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get the highest priority role from a list
 */
export function getHighestRole(roles: UserRole[]): UserRole | null {
  const priority: Record<UserRole, number> = {
    super_admin: 4,
    admin: 3,
    teacher: 2,
    parent: 1,
  };

  return roles.reduce<UserRole | null>((highest, role) => {
    if (!highest || priority[role] > priority[highest]) {
      return role;
    }
    return highest;
  }, null);
}

/**
 * Group permissions by feature
 */
export function groupPermissionsByFeature(permissions: Permission[]): FeaturePermissions[] {
  const grouped = new Map<FeatureKey, Permission[]>();

  permissions.forEach(permission => {
    if (!grouped.has(permission.feature_key)) {
      grouped.set(permission.feature_key, []);
    }
    grouped.get(permission.feature_key)!.push(permission);
  });

  return Array.from(grouped.entries()).map(([feature_key, perms]) => {
    const first = perms[0];
    return {
      feature_key,
      feature_name: first.feature_name,
      description: first.description,
      category: first.category,
      permissions: {
        view: perms.some(p => p.permission_level === 'view'),
        edit: perms.some(p => p.permission_level === 'edit'),
        create: perms.some(p => p.permission_level === 'create'),
        delete: perms.some(p => p.permission_level === 'delete'),
      },
      can_share: perms.some(p => p.can_share_with_others),
    };
  });
}

/**
 * Check if permission level includes another
 * delete > create > edit > view
 */
export function permissionIncludes(has: PermissionLevel, needs: PermissionLevel): boolean {
  const hierarchy: Record<PermissionLevel, number> = {
    view: 1,
    edit: 2,
    create: 3,
    delete: 4,
  };

  return hierarchy[has] >= hierarchy[needs];
}

/**
 * Format role name for display
 */
export function formatRoleName(role: UserRole): string {
  return ROLE_NAMES[role];
}

/**
 * Format feature name for display
 */
export function formatFeatureName(featureKey: FeatureKey): string {
  return FEATURE_NAMES[featureKey];
}

/**
 * Get feature icon (for UI)
 */
export function getFeatureIcon(featureKey: FeatureKey): string {
  const icons: Record<FeatureKey, string> = {
    three_part_card_generator: '🎴',
    curriculum_viewer: '📚',
    progress_dashboard: '📊',
    activity_management: '✏️',
    report_generation: '📄',
    resource_library: '📁',
    lesson_planner: '📅',
    student_management: '👥',
  };
  return icons[featureKey] || '📌';
}

/**
 * Get role badge color (for UI)
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
    teacher: 'bg-blue-100 text-blue-800',
    parent: 'bg-green-100 text-green-800',
  };
  return colors[role];
}

/**
 * Get category badge color (for UI)
 */
export function getCategoryBadgeColor(category: FeatureCategory): string {
  const colors: Record<FeatureCategory, string> = {
    tools: 'bg-blue-100 text-blue-800',
    curriculum: 'bg-green-100 text-green-800',
    assessment: 'bg-yellow-100 text-yellow-800',
    admin: 'bg-red-100 text-red-800',
  };
  return colors[category];
}











