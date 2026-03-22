// /api/montree/super-admin/schools/route.ts
// Super Admin API - List schools with activity/cost stats, batch delete
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

// Cost model constants (per interaction, approximate)
const COST_PER_INTERACTION: Record<string, number> = {
  'claude-sonnet-4-20250514': 0.105,    // ~25K input + ~2K output
  'claude-haiku-3-20240307': 0.028,     // ~25K input + ~2K output
  'claude-3-5-haiku-20241022': 0.028,
  'claude-3-haiku-20240307': 0.028,
  'default': 0.06,                       // fallback average
};

function estimateCost(modelUsed: string | null): number {
  if (!modelUsed) return COST_PER_INTERACTION['default'];
  // Check exact match first, then partial match
  if (COST_PER_INTERACTION[modelUsed]) return COST_PER_INTERACTION[modelUsed];
  if (modelUsed.includes('haiku')) return COST_PER_INTERACTION['claude-haiku-3-20240307'];
  if (modelUsed.includes('sonnet')) return COST_PER_INTERACTION['claude-sonnet-4-20250514'];
  return COST_PER_INTERACTION['default'];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Auth
    const { searchParams } = new URL(request.url);
    const password = request.headers.get('x-super-admin-password') || searchParams.get('password');
    const { valid } = verifySuperAdminPassword(password);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('montree_schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (schoolsError) {
      console.error('Schools fetch error:', schoolsError);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // 2. Fetch counts (classrooms, teachers, children) — all in parallel
    const [classroomRes, teacherRes, childrenRes] = await Promise.all([
      supabase.from('montree_classrooms').select('school_id'),
      supabase.from('montree_teachers').select('school_id'),
      supabase.from('montree_children').select('school_id'),
    ]);

    // Build count maps (O(N) instead of O(N²))
    const classroomCountMap: Record<string, number> = {};
    (classroomRes.data || []).forEach(c => {
      classroomCountMap[c.school_id] = (classroomCountMap[c.school_id] || 0) + 1;
    });
    const teacherCountMap: Record<string, number> = {};
    (teacherRes.data || []).forEach(t => {
      teacherCountMap[t.school_id] = (teacherCountMap[t.school_id] || 0) + 1;
    });
    const childCountMap: Record<string, number> = {};
    (childrenRes.data || []).forEach(s => {
      childCountMap[s.school_id] = (childCountMap[s.school_id] || 0) + 1;
    });

    // 3. Fetch last activity — guru interactions (most reliable activity signal)
    // Join through children to get school_id
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get all children with school mapping for joins
    const { data: allChildren } = await supabase
      .from('montree_children')
      .select('id, school_id');

    const childToSchool: Record<string, string> = {};
    (allChildren || []).forEach(c => { childToSchool[c.id] = c.school_id; });

    // Fetch recent interactions (last 30 days) for cost estimation
    const { data: recentInteractions } = await supabase
      .from('montree_guru_interactions')
      .select('child_id, model_used, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    // Fetch last media upload per school (activity signal)
    const { data: recentMedia } = await supabase
      .from('montree_media')
      .select('child_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    // Build activity + cost maps
    const lastInteractionMap: Record<string, string> = {};
    const costMap: Record<string, number> = {};
    const interactionCountMap: Record<string, number> = {};

    (recentInteractions || []).forEach(i => {
      const schoolId = childToSchool[i.child_id];
      if (!schoolId) return;

      // Last interaction timestamp
      if (!lastInteractionMap[schoolId] || i.created_at > lastInteractionMap[schoolId]) {
        lastInteractionMap[schoolId] = i.created_at;
      }

      // Cost estimation
      costMap[schoolId] = (costMap[schoolId] || 0) + estimateCost(i.model_used);
      interactionCountMap[schoolId] = (interactionCountMap[schoolId] || 0) + 1;
    });

    // Last media upload
    const lastMediaMap: Record<string, string> = {};
    (recentMedia || []).forEach(m => {
      const schoolId = childToSchool[m.child_id];
      if (!schoolId) return;
      if (!lastMediaMap[schoolId] || m.created_at > lastMediaMap[schoolId]) {
        lastMediaMap[schoolId] = m.created_at;
      }
    });

    // 4. Assemble enriched school objects
    const schoolStats = (schools || []).map(school => {
      const lastInteraction = lastInteractionMap[school.id] || null;
      const lastMedia = lastMediaMap[school.id] || null;
      let lastActiveAt: string | null = null;
      if (lastInteraction && lastMedia) {
        lastActiveAt = lastInteraction > lastMedia ? lastInteraction : lastMedia;
      } else {
        lastActiveAt = lastInteraction || lastMedia || null;
      }

      return {
        ...school,
        classroom_count: classroomCountMap[school.id] || 0,
        teacher_count: teacherCountMap[school.id] || 0,
        student_count: childCountMap[school.id] || 0,
        last_active_at: lastActiveAt,
        estimated_monthly_cost: Math.round((costMap[school.id] || 0) * 100) / 100,
        interaction_count_30d: interactionCountMap[school.id] || 0,
      };
    });

    return NextResponse.json({ schools: schoolStats });

  } catch (error) {
    console.error('Super admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update school status (subscription tier)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const body = await request.json();
    const { schoolId, subscription_tier, subscription_status, password } = body;

    const { valid: patchPasswordValid } = verifySuperAdminPassword(password);
    if (!patchPasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (subscription_tier) updateData.subscription_tier = subscription_tier;
    if (subscription_status) updateData.subscription_status = subscription_status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('montree_schools')
      .update(updateData)
      .eq('id', schoolId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to update school:', error);
      return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
    }

    return NextResponse.json({ school: data });

  } catch (error) {
    console.error('Update school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Batch delete schools and all their data
// NO rate limit — super admin controls cleanup
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const password = request.headers.get('x-super-admin-password');
    const { valid: deletePasswordValid } = verifySuperAdminPassword(password);
    if (!deletePasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Accept body with schoolIds array OR single schoolId in query
    let schoolIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body.schoolIds)) {
        schoolIds = body.schoolIds;
      } else if (body.schoolId) {
        schoolIds = [body.schoolId];
      }
    } catch {
      // Fallback to query param for backward compat
      const { searchParams } = new URL(request.url);
      const singleId = searchParams.get('schoolId');
      if (singleId) schoolIds = [singleId];
    }

    if (schoolIds.length === 0) {
      return NextResponse.json({ error: 'schoolIds required' }, { status: 400 });
    }

    // Fetch school names for audit log
    const { data: schoolRecords } = await supabase
      .from('montree_schools')
      .select('id, name')
      .in('id', schoolIds);

    const schoolNameMap: Record<string, string> = {};
    (schoolRecords || []).forEach(s => { schoolNameMap[s.id] = s.name; });

    // Log batch audit BEFORE any deletions
    logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'school_delete',
      resourceType: 'school',
      resourceId: schoolIds.join(','),
      resourceDetails: {
        endpoint: '/api/montree/super-admin/schools',
        batch: true,
        count: schoolIds.length,
        schools: schoolIds.map(id => ({ id, name: schoolNameMap[id] || 'unknown' })),
      },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
      isSensitive: true,
    });

    // Process each school independently
    const results: Array<{ schoolId: string; name: string; success: boolean; error?: string }> = [];

    for (const schoolId of schoolIds) {
      try {
        await cascadeDeleteSchool(supabase, schoolId);
        results.push({
          schoolId,
          name: schoolNameMap[schoolId] || 'unknown',
          success: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to delete school ${schoolId}:`, msg);
        results.push({
          schoolId,
          name: schoolNameMap[schoolId] || 'unknown',
          success: false,
          error: msg,
        });
      }
    }

    const deleted = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ results, deleted, failed, success: failed === 0 });

  } catch (error) {
    console.error('Delete school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Cascade delete a single school and ALL related data.
 * Order matters — delete leaf tables first, then parent tables.
 */
async function cascadeDeleteSchool(supabase: ReturnType<typeof getSupabase>, schoolId: string) {
  // Step 1: Get all child IDs for this school
  const { data: children } = await supabase
    .from('montree_children')
    .select('id')
    .eq('school_id', schoolId);

  const childIds = (children || []).map(c => c.id);

  // Step 2: Delete child-linked tables (in chunks of 500 to avoid Postgres limits)
  if (childIds.length > 0) {
    const childLinkedTables = [
      'montree_child_progress',
      'montree_guru_interactions',
      'montree_media_children',
      'montree_behavioral_observations',
      'montree_guru_corrections',
      'montree_child_extras',
      'montree_voice_notes',
      'montree_weekly_reports',
    ];

    for (let i = 0; i < childIds.length; i += 500) {
      const chunk = childIds.slice(i, i + 500);
      for (const table of childLinkedTables) {
        await supabase.from(table).delete().in('child_id', chunk).then(({ error }) => {
          if (error) console.warn(`[cascade] ${table} child_id delete warning:`, error.message);
        });
      }
    }

    // Media table — also has child_id
    for (let i = 0; i < childIds.length; i += 500) {
      const chunk = childIds.slice(i, i + 500);
      await supabase.from('montree_media').delete().in('child_id', chunk).then(({ error }) => {
        if (error) console.warn('[cascade] montree_media delete warning:', error.message);
      });
    }
  }

  // Step 3: Get all classroom IDs for this school
  const { data: classrooms } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('school_id', schoolId);

  const classroomIds = (classrooms || []).map(c => c.id);

  // Step 4: Delete classroom-linked tables
  if (classroomIds.length > 0) {
    const classroomLinkedTables = [
      'montree_visual_memory',
      'montree_classroom_curriculum_areas',
    ];

    for (const table of classroomLinkedTables) {
      await supabase.from(table).delete().in('classroom_id', classroomIds).then(({ error }) => {
        if (error) console.warn(`[cascade] ${table} classroom_id delete warning:`, error.message);
      });
    }
  }

  // Step 5: Delete school-linked tables
  const schoolLinkedTables = [
    'montree_student_aliases',
    'montree_children',
    'montree_teachers',
    'montree_curriculum_imports',
    'montree_work_imports',
    'montree_custom_curriculum',
    'montree_classrooms',
    'montree_school_admins',
    'montree_school_features',
  ];

  for (const table of schoolLinkedTables) {
    await supabase.from(table).delete().eq('school_id', schoolId).then(({ error }) => {
      if (error) console.warn(`[cascade] ${table} school_id delete warning:`, error.message);
    });
  }

  // Step 6: Delete the school itself
  const { error: schoolError } = await supabase
    .from('montree_schools')
    .delete()
    .eq('id', schoolId);

  if (schoolError) {
    throw new Error(`Failed to delete school record: ${schoolError.message}`);
  }
}
