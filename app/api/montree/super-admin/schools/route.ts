// /api/montree/super-admin/schools/route.ts
// Super Admin API - List schools with activity/cost stats, batch delete
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { checkRateLimit } from '@/lib/rate-limiter';
import { clearBudgetCache } from '@/lib/montree/api-usage';

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

    // Auth — JWT token preferred, password header as fallback (no query param)
    const { valid } = await verifySuperAdminAuth(request.headers);
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

    // 2. Fetch counts (classrooms, teachers, children) + login codes labelled by who-they-belong-to.
    // Pulls from BOTH montree_teachers (teacher codes) AND montree_school_admins (principal codes)
    // so the super-admin display can label every code with the person it unlocks.
    const [classroomRes, teacherRes, childrenRes, teacherCodesRes, principalCodesRes] = await Promise.all([
      supabase.from('montree_classrooms').select('school_id'),
      supabase.from('montree_teachers').select('school_id'),
      supabase.from('montree_children').select('school_id').not('school_id', 'is', null),
      supabase
        .from('montree_teachers')
        .select('school_id, login_code, name, role, is_active')
        .not('login_code', 'is', null),
      supabase
        .from('montree_school_admins')
        .select('school_id, login_code, name, is_active')
        .not('login_code', 'is', null),
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

    // Labelled login codes per school. Each entry: { code, role, name, active }.
    // Sorted principals first, then lead teachers, then teachers, then assistants —
    // so the super-admin row shows the most important codes first.
    interface LabelledCode { code: string; role: 'principal' | 'lead_teacher' | 'teacher' | 'assistant_teacher'; name: string; active: boolean; }
    const ROLE_RANK: Record<LabelledCode['role'], number> = {
      principal: 0,
      lead_teacher: 1,
      teacher: 2,
      assistant_teacher: 3,
    };
    const codesBySchool: Record<string, LabelledCode[]> = {};
    const seenPerSchool: Record<string, Set<string>> = {};

    const pushCode = (schoolId: string, entry: LabelledCode) => {
      if (!codesBySchool[schoolId]) codesBySchool[schoolId] = [];
      if (!seenPerSchool[schoolId]) seenPerSchool[schoolId] = new Set();
      if (seenPerSchool[schoolId].has(entry.code)) return;
      seenPerSchool[schoolId].add(entry.code);
      codesBySchool[schoolId].push(entry);
    };

    (principalCodesRes.data || []).forEach(p => {
      if (!p.login_code) return;
      pushCode(p.school_id, {
        code: p.login_code,
        role: 'principal',
        name: p.name || 'Principal',
        active: p.is_active !== false,
      });
    });
    (teacherCodesRes.data || []).forEach(t => {
      if (!t.login_code) return;
      const r = (t.role || 'teacher') as 'lead_teacher' | 'teacher' | 'assistant_teacher';
      const safeRole: LabelledCode['role'] =
        r === 'lead_teacher' || r === 'teacher' || r === 'assistant_teacher' ? r : 'teacher';
      pushCode(t.school_id, {
        code: t.login_code,
        role: safeRole,
        name: t.name || 'Teacher',
        active: t.is_active !== false,
      });
    });

    // Sort each school's codes by role rank.
    Object.keys(codesBySchool).forEach(schoolId => {
      codesBySchool[schoolId].sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role]);
    });

    // Backward-compat flat array (other callers / search filter still rely on it).
    const loginCodeMap: Record<string, string[]> = {};
    Object.keys(codesBySchool).forEach(schoolId => {
      loginCodeMap[schoolId] = codesBySchool[schoolId].map(c => c.code);
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

    // 3a. Fetch AI tier flags (ai_tier_haiku / ai_tier_sonnet) per school
    const { data: tierFlagsRaw } = await supabase
      .from('montree_school_features')
      .select('school_id, feature_key, enabled')
      .in('feature_key', ['ai_tier_haiku', 'ai_tier_sonnet']);

    const aiTierMap: Record<string, 'free' | 'premium'> = {};
    for (const row of (tierFlagsRaw || []) as Array<{ school_id: string; feature_key: string; enabled: boolean }>) {
      if (!row.enabled) continue;
      // Both haiku-only and sonnet schools map to 'premium' in the two-tier UI
      if (row.feature_key === 'ai_tier_sonnet' || row.feature_key === 'ai_tier_haiku') {
        aiTierMap[row.school_id] = 'premium';
      }
    }

    // 3b. Fetch actual API usage from montree_api_usage (this month).
    // Also captures per-school MAX created_at so we have a comprehensive
    // "last active" signal — every API call (photo capture, weekly wrap,
    // replan, guru, etc.) writes a row here, so it's a much wider signal
    // than just guru interactions + media uploads.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: apiUsageRaw } = await supabase
      .from('montree_api_usage')
      .select('school_id, cost_usd, created_at')
      .gte('created_at', monthStart.toISOString());

    const apiSpentMap: Record<string, number> = {};
    const apiCallsMap: Record<string, number> = {};
    const lastApiUsageMap: Record<string, string> = {};
    (apiUsageRaw || []).forEach((row: { school_id: string; cost_usd: number; created_at: string }) => {
      apiSpentMap[row.school_id] = (apiSpentMap[row.school_id] || 0) + Number(row.cost_usd);
      apiCallsMap[row.school_id] = (apiCallsMap[row.school_id] || 0) + 1;
      if (!lastApiUsageMap[row.school_id] || row.created_at > lastApiUsageMap[row.school_id]) {
        lastApiUsageMap[row.school_id] = row.created_at;
      }
    });

    // Single query for all interactions — filter in-memory for cost (30-day window)
    const { data: allInteractionsRaw } = await supabase
      .from('montree_guru_interactions')
      .select('child_id, model_used, asked_at')
      .order('asked_at', { ascending: false })
      .limit(5000);

    const allInteractions = allInteractionsRaw || [];
    const recentInteractions = allInteractions.filter(i => i.asked_at >= thirtyDaysAgo);

    // Fetch last media upload per school (activity signal)
    const { data: recentMedia } = await supabase
      .from('montree_media')
      .select('child_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    // Build activity map from ALL interactions (no time filter)
    const lastInteractionMap: Record<string, string> = {};
    allInteractions.forEach(i => {
      const schoolId = childToSchool[i.child_id];
      if (!schoolId) return;
      if (!lastInteractionMap[schoolId] || i.asked_at > lastInteractionMap[schoolId]) {
        lastInteractionMap[schoolId] = i.asked_at;
      }
    });

    // Build cost maps from recent interactions only (30-day window)
    const costMap: Record<string, number> = {};
    const interactionCountMap: Record<string, number> = {};
    recentInteractions.forEach(i => {
      const schoolId = childToSchool[i.child_id];
      if (!schoolId) return;
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
      const lastApiUsage = lastApiUsageMap[school.id] || null;
      // last_active = max of (api_usage, guru_interaction, media_upload).
      // api_usage is the widest signal (catches photo capture, weekly wrap,
      // replan, every Sonnet/Haiku call). Including it fixes the case where
      // active schools showed "Never" because they hadn't used Guru directly
      // and their media uploads fell outside the global recent-500 window.
      const candidates = [lastInteraction, lastMedia, lastApiUsage].filter(Boolean) as string[];
      const lastActiveAt = candidates.length > 0
        ? candidates.reduce((max, ts) => (ts > max ? ts : max))
        : null;

      return {
        ...school,
        classroom_count: classroomCountMap[school.id] || 0,
        teacher_count: teacherCountMap[school.id] || 0,
        student_count: childCountMap[school.id] || 0,
        last_active_at: lastActiveAt,
        estimated_monthly_cost: Math.round((costMap[school.id] || 0) * 100) / 100,
        interaction_count_30d: interactionCountMap[school.id] || 0,
        monthly_ai_budget_usd: school.monthly_ai_budget_usd ?? 0,
        ai_budget_action: school.ai_budget_action ?? 'hard_limit',
        api_spent_this_month: Math.round((apiSpentMap[school.id] || 0) * 10000) / 10000,
        api_calls_this_month: apiCallsMap[school.id] || 0,
        ai_tier: aiTierMap[school.id] || 'free',
        login_codes: loginCodeMap[school.id] || [],
        login_codes_labelled: codesBySchool[school.id] || [],
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

    // Auth — JWT token preferred, password in body as fallback
    const { valid: patchPasswordValid } = await verifySuperAdminAuth(request.headers);
    if (!patchPasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { schoolId, subscription_tier, subscription_status, monthly_ai_budget_usd, ai_budget_action, ai_tier } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    // ── AI tier change: toggle feature flags + set budget ──────────
    if (ai_tier !== undefined) {
      const VALID_AI_TIERS = ['free', 'premium'];
      if (!VALID_AI_TIERS.includes(ai_tier)) {
        return NextResponse.json({ error: 'ai_tier must be free or premium' }, { status: 400 });
      }

      // Premium enables both haiku and sonnet; free disables both
      const haikuEnabled = ai_tier === 'premium';
      const sonnetEnabled = ai_tier === 'premium';

      // Upsert both feature flags atomically
      for (const [key, enabled] of [['ai_tier_haiku', haikuEnabled], ['ai_tier_sonnet', sonnetEnabled]] as const) {
        const { error: flagErr } = await supabase
          .from('montree_school_features')
          .upsert(
            { school_id: schoolId, feature_key: key, enabled, enabled_by: 'super_admin_tier_change' },
            { onConflict: 'school_id,feature_key' }
          );
        if (flagErr) {
          console.error(`Failed to set ${key} for ${schoolId}:`, flagErr);
          return NextResponse.json({ error: `Failed to set feature flag ${key}` }, { status: 500 });
        }
      }

      // Also set budget: free=$0/hard_limit, premium=$9999/warn
      const tierBudget = ai_tier === 'free' ? 0 : 9999;
      const tierAction = ai_tier === 'free' ? 'hard_limit' : 'warn';
      const { error: budgetErr } = await supabase
        .from('montree_schools')
        .update({ monthly_ai_budget_usd: tierBudget, ai_budget_action: tierAction })
        .eq('id', schoolId);
      if (budgetErr) {
        console.error(`Failed to set budget for ${schoolId}:`, budgetErr);
      }

      clearBudgetCache(schoolId);

      // If only ai_tier was sent, return early with the updated tier
      if (!subscription_tier && !subscription_status && monthly_ai_budget_usd === undefined && ai_budget_action === undefined) {
        return NextResponse.json({ success: true, ai_tier, schoolId });
      }
    }

    // Tier validation
    const VALID_TIERS = ['trial', 'free', 'basic', 'standard', 'premium'];
    if (subscription_tier && !VALID_TIERS.includes(subscription_tier)) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    const VALID_STATUSES = ['trialing', 'active', 'canceled', 'past_due', 'inactive'];
    if (subscription_status && !VALID_STATUSES.includes(subscription_status)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (subscription_tier) updateData.subscription_tier = subscription_tier;
    if (subscription_status) updateData.subscription_status = subscription_status;

    // AI budget fields
    if (monthly_ai_budget_usd !== undefined) {
      const budget = Number(monthly_ai_budget_usd);
      if (isNaN(budget) || budget < 0 || budget > 10000) {
        return NextResponse.json({ error: 'Budget must be between $0 and $10,000' }, { status: 400 });
      }
      updateData.monthly_ai_budget_usd = budget;
    }

    if (ai_budget_action !== undefined) {
      if (!['warn', 'soft_limit', 'hard_limit'].includes(ai_budget_action)) {
        return NextResponse.json({ error: 'Action must be warn, soft_limit, or hard_limit' }, { status: 400 });
      }
      updateData.ai_budget_action = ai_budget_action;
    }

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

    if (!data) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Clear budget cache if budget fields changed
    if (monthly_ai_budget_usd !== undefined || ai_budget_action !== undefined) {
      clearBudgetCache(schoolId);
    }

    return NextResponse.json({ school: data });

  } catch (error) {
    console.error('Update school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Batch delete schools and all their data
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Auth — JWT token preferred
    const { valid: deletePasswordValid } = await verifySuperAdminAuth(request.headers);
    if (!deletePasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: max 5 deletes per 15 minutes
    try {
      const ip = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/schools/DELETE', 5, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many delete requests. Try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch {
      // Rate limit check failed (non-blocking)
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

    if (schoolIds.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 schools per delete request' }, { status: 400 });
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
          error: 'Delete failed',
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
  if (!schoolId) throw new Error('schoolId required for cascade delete');

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
      if (chunk.length === 0) continue;
      for (const table of childLinkedTables) {
        await supabase.from(table).delete().in('child_id', chunk).then(({ error }) => {
          if (error) console.warn(`[cascade] ${table} child_id delete warning:`, error.message);
        });
      }
    }

    // Media table — also has child_id
    for (let i = 0; i < childIds.length; i += 500) {
      const chunk = childIds.slice(i, i + 500);
      if (chunk.length === 0) continue;
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
