// Multi-role authentication system for Montree Standalone
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const SECRET = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || "montree-secret-change-in-production";
const SECRET_KEY = new TextEncoder().encode(SECRET);

// User roles
export type UserRole = 'super_admin' | 'school_admin' | 'teacher' | 'parent';

// Session payload
export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  classroomId?: string | null;
}

// Full user object from database
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  school_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

// Role permissions
export const ROLE_PERMISSIONS = {
  super_admin: {
    canEditCurriculum: true,
    canManageSchools: true,
    canManageUsers: true,
    canViewAllSchools: true,
    canAccessAdmin: true,
    canUseTools: true,
    canTrackProgress: true,
    canViewReports: true,
  },
  school_admin: {
    canEditCurriculum: false,
    canManageSchools: false,
    canManageUsers: true,  // Only their school's users
    canViewAllSchools: false,
    canAccessAdmin: true,
    canUseTools: true,
    canTrackProgress: true,
    canViewReports: true,
  },
  teacher: {
    canEditCurriculum: false,
    canManageSchools: false,
    canManageUsers: false,
    canViewAllSchools: false,
    canAccessAdmin: false,
    canUseTools: true,
    canTrackProgress: true,
    canViewReports: true,
  },
  parent: {
    canEditCurriculum: false,
    canManageSchools: false,
    canManageUsers: false,
    canViewAllSchools: false,
    canAccessAdmin: false,
    canUseTools: false,
    canTrackProgress: false,
    canViewReports: true,  // Only their children
  },
} as const;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token creation
export async function createUserToken(user: UserSession): Promise<string> {
  const token = await new SignJWT({
    userId: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
    classroomId: user.classroomId || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
  return token;
}

// JWT Token verification
export async function verifyUserToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      schoolId: payload.schoolId as string | null,
      classroomId: payload.classroomId as string | null,
    };
  } catch {
    return null;
  }
}

// Get current user session from cookies
export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("user-token")?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyUserToken(token);
}

// Check if user has specific permission
export function hasPermission(
  role: UserRole,
  permission: keyof typeof ROLE_PERMISSIONS.super_admin
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

// Check if user can access a specific route
export function canAccessRoute(role: UserRole, route: string): boolean {
  // Super admin can access everything
  if (role === 'super_admin') return true;
  
  // Admin-only routes
  const adminOnlyRoutes = [
    '/admin/montree',
    '/admin/seed',
    '/admin/rbac',
    '/admin/testing',
  ];
  
  if (adminOnlyRoutes.some(r => route.startsWith(r))) {
    return role === 'super_admin';
  }
  
  // School admin routes
  const schoolAdminRoutes = [
    '/admin/users',
    '/admin/classrooms',
  ];
  
  if (schoolAdminRoutes.some(r => route.startsWith(r))) {
    return ['super_admin', 'school_admin'].includes(role);
  }
  
  // Teacher routes - accessible by teachers and above
  const teacherRoutes = [
    '/teacher',
    '/admin/tools',
    '/admin/label-maker',
    '/admin/flashcard-maker',
    '/admin/ai-planner',
    '/admin/weekly-planning',
    '/admin/child-progress',
    '/admin/children',
    '/admin/classroom',
  ];
  
  if (teacherRoutes.some(r => route.startsWith(r))) {
    return ['super_admin', 'school_admin', 'teacher'].includes(role);
  }
  
  // Parent routes
  const parentRoutes = [
    '/parent',
  ];
  
  if (parentRoutes.some(r => route.startsWith(r))) {
    return true; // All roles can access parent routes for their children
  }
  
  return false;
}

// Legacy admin check (for backwards compatibility)
export async function getAdminSession(): Promise<{ isAdmin: boolean } | null> {
  const session = await getUserSession();
  if (!session) return null;
  
  // Super admin and school admin count as "admin" for legacy routes
  const isAdmin = ['super_admin', 'school_admin'].includes(session.role);
  return isAdmin ? { isAdmin: true } : null;
}

// Set user token cookie
export async function setUserCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("user-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Clear user token cookie
export async function clearUserCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("user-token");
}
