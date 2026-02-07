// lib/montree/auth-context.ts
// Session validation and context extraction for API routes
// Ensures data isolation between schools

import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// ============================================
// TYPES
// ============================================

export interface TeacherSession {
  type: 'teacher';
  teacherId: string;
  schoolId: string;
  classroomIds: string[];
  name: string;
}

export interface ParentSession {
  type: 'parent';
  parentId: string;
  schoolId: string;
  childIds: string[];
  name: string;
}

export interface PrincipalSession {
  type: 'principal';
  principalId: string;
  schoolId: string;
  name: string;
}

export type AuthSession = TeacherSession | ParentSession | PrincipalSession;

// ============================================
// VALIDATE TEACHER SESSION
// ============================================

export async function validateTeacherSession(
  request: NextRequest
): Promise<TeacherSession | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());

    if (!sessionData.teacherId || !sessionData.schoolId) {
      return null;
    }

    // Verify teacher exists and is active
    const supabase = getSupabase();
    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .select('id, name, school_id, is_active')
      .eq('id', sessionData.teacherId)
      .single();

    if (error || !teacher || !teacher.is_active) {
      return null;
    }

    // Get teacher's classrooms
    const { data: assignments } = await supabase
      .from('montree_teacher_classrooms')
      .select('classroom_id')
      .eq('teacher_id', teacher.id);

    return {
      type: 'teacher',
      teacherId: teacher.id,
      schoolId: teacher.school_id,
      classroomIds: (assignments || []).map(a => a.classroom_id),
      name: teacher.name,
    };
  } catch {
    return null;
  }
}

// ============================================
// VALIDATE PARENT SESSION
// ============================================

export async function validateParentSession(
  request: NextRequest
): Promise<ParentSession | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString());

    if (!sessionData.parentId) {
      return null;
    }

    const supabase = getSupabase();
    
    // Verify parent exists and is active
    const { data: parent, error } = await supabase
      .from('montree_parents')
      .select('id, name, school_id, is_active')
      .eq('id', sessionData.parentId)
      .single();

    if (error || !parent || !parent.is_active) {
      return null;
    }

    // Get parent's children
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select('child_id')
      .eq('parent_id', parent.id);

    return {
      type: 'parent',
      parentId: parent.id,
      schoolId: parent.school_id,
      childIds: (links || []).map(l => l.child_id),
      name: parent.name,
    };
  } catch {
    return null;
  }
}

// ============================================
// CHECK ACCESS PERMISSIONS
// ============================================

export async function canAccessChild(
  session: AuthSession,
  childId: string
): Promise<boolean> {
  if (session.type === 'parent') {
    return session.childIds.includes(childId);
  }

  if (session.type === 'teacher') {
    const supabase = getSupabase();
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (!child) return false;
    return session.classroomIds.includes(child.classroom_id);
  }

  if (session.type === 'principal') {
    const supabase = getSupabase();
    const { data: child } = await supabase
      .from('montree_children')
      .select(`
        classroom_id,
        montree_classrooms!inner ( school_id )
      `)
      .eq('id', childId)
      .single();

    if (!child) return false;
    const classroomData = child.montree_classrooms as unknown as { school_id: string };
    return classroomData.school_id === session.schoolId;
  }

  return false;
}

export async function canAccessClassroom(
  session: AuthSession,
  classroomId: string
): Promise<boolean> {
  if (session.type === 'teacher') {
    return session.classroomIds.includes(classroomId);
  }

  if (session.type === 'principal') {
    const supabase = getSupabase();
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .single();

    if (!classroom) return false;
    return classroom.school_id === session.schoolId;
  }

  return false;
}

// ============================================
// FILTER QUERIES BY SCHOOL
// ============================================

export function getSchoolFilter(session: AuthSession): string {
  return session.schoolId;
}

export function getClassroomFilter(session: AuthSession): string[] {
  if (session.type === 'teacher') {
    return session.classroomIds;
  }
  return []; // Principal gets all classrooms via school filter
}

export function getChildFilter(session: AuthSession): string[] {
  if (session.type === 'parent') {
    return session.childIds;
  }
  return []; // Teachers filter by classroom
}
