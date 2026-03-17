// lib/montree/verify-child-access.ts
// SECURITY: Centralized helper to verify a child belongs to the authenticated user's school.
// Prevents cross-pollination where Teacher A can access School B's children.
//
// Usage in any API route:
//
//   import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
//
//   export async function GET(request: NextRequest) {
//     const auth = await verifySchoolRequest(request);
//     if (auth instanceof NextResponse) return auth;
//
//     const childId = searchParams.get('child_id');
//     const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
//     if (!access.allowed) {
//       return NextResponse.json({ error: 'Access denied' }, { status: 403 });
//     }
//     // ... safe to proceed
//   }

import { getSupabase } from '@/lib/supabase-client';

interface ChildAccessResult {
  allowed: boolean;
  classroomId?: string;
}

// Cache with TTL to avoid repeated DB lookups
// Key: `${childId}:${schoolId}`, Value: { result, expiresAt }
const CACHE_TTL_MS = 30_000; // 30 seconds
const accessCache = new Map<string, { result: ChildAccessResult; expiresAt: number }>();

/**
 * Verify that a child belongs to a classroom within the given school.
 * Returns { allowed: true, classroomId } if the child is in the school.
 * Returns { allowed: false } if the child is NOT in the school or doesn't exist.
 *
 * This is the SINGLE source of truth for child access control.
 * Every API route that accepts a child_id MUST call this before returning data.
 */
export async function verifyChildBelongsToSchool(
  childId: string,
  schoolId: string
): Promise<ChildAccessResult> {
  if (!childId || !schoolId) {
    return { allowed: false };
  }

  const cacheKey = `${childId}:${schoolId}`;
  const cached = accessCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) accessCache.delete(cacheKey); // Expired — remove stale entry

  try {
    const supabase = getSupabase();

    // Join children → classrooms to check school ownership
    const { data, error } = await supabase
      .from('montree_children')
      .select('id, classroom_id, montree_classrooms!inner(school_id)')
      .eq('id', childId)
      .eq('montree_classrooms.school_id', schoolId)
      .single();

    if (error || !data) {
      const result = { allowed: false };
      accessCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }

    const result: ChildAccessResult = {
      allowed: true,
      classroomId: data.classroom_id,
    };
    accessCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return { allowed: false };
  }
}

/**
 * Clear the child access cache. Call this when progress updates happen
 * or when you need to force a fresh DB lookup for a specific child.
 */
export function clearChildAccessCache(childId?: string, schoolId?: string): void {
  if (childId && schoolId) {
    // Clear a specific entry
    const cacheKey = `${childId}:${schoolId}`;
    accessCache.delete(cacheKey);
  } else {
    // Clear the entire cache
    accessCache.clear();
  }
}

/**
 * Verify multiple child IDs belong to the same school.
 * Returns only the IDs that pass verification.
 */
export async function verifyChildrenBelongToSchool(
  childIds: string[],
  schoolId: string
): Promise<string[]> {
  if (!childIds.length || !schoolId) return [];

  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montree_children')
      .select('id, montree_classrooms!inner(school_id)')
      .in('id', childIds)
      .eq('montree_classrooms.school_id', schoolId);

    if (error || !data) return [];
    return data.map((d: { id: string }) => d.id);
  } catch {
    return [];
  }
}
