// lib/montree/admin/guru-executor.ts
// Tool execution handlers for Principal Admin Guru
// All queries are school-scoped — principal only sees their own school's data

import { SupabaseClient } from '@supabase/supabase-js';

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** Clamp a numeric parameter within safe bounds */
function clampParam(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : fallback;
  return Math.max(min, Math.min(max, num));
}

/** Validate a table name against the allowed tables whitelist */
function validateTable(table: string, allowedTables: Set<string>): boolean {
  return allowedTables.has(table);
}

/**
 * Apply a filter to a Supabase query builder.
 * Returns the modified query, or null if the filter is invalid.
 */
function applyFilter(
  query: ReturnType<SupabaseClient['from']>,
  filter: { column: string; op: string; value?: unknown }
): ReturnType<SupabaseClient['from']> | null {
  const { column, op, value } = filter;
  if (!column || typeof column !== 'string') return null;

  switch (op) {
    case 'eq':
      return query.eq(column, value);
    case 'neq':
      return query.neq(column, value);
    case 'gt':
      return query.gt(column, value);
    case 'gte':
      return query.gte(column, value);
    case 'lt':
      return query.lt(column, value);
    case 'lte':
      return query.lte(column, value);
    case 'like':
      return query.like(column, String(value));
    case 'ilike':
      return query.ilike(column, String(value));
    case 'is_null':
      return query.is(column, null);
    case 'not_null':
      return query.not(column, 'is', null);
    default:
      return null;
  }
}

/**
 * Get classroom IDs for a school (needed to scope tables that don't have school_id directly).
 */
async function getSchoolClassroomIds(
  supabase: SupabaseClient,
  schoolId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('montree_classrooms')
    .select('id')
    .eq('school_id', schoolId);
  if (error) {
    console.error('[Principal Guru] Failed to fetch classroom IDs:', error.message);
    return [];
  }
  return (data || []).map((c: { id: string }) => c.id);
}

/**
 * Tables that have a direct school_id column.
 */
const TABLES_WITH_SCHOOL_ID = new Set([
  'montree_classrooms',
  'montree_teachers',
  'montree_school_features',
]);

/**
 * Tables that scope via classroom_id (need classroom lookup first).
 */
const TABLES_WITH_CLASSROOM_ID = new Set([
  'montree_children',
  'montree_classroom_curriculum_works',
  'montree_classroom_curriculum_areas',
  'montree_parent_invites',
  'montree_events',
  'montree_visual_memory',
  'montree_voice_notes',
  'montree_weekly_admin_output',
  'montree_conference_notes',
  'montree_attendance_override',
  'montree_stale_work_dismissals',
  'montree_guru_interactions',
]);

/**
 * Tables that scope via child_id (need classroom → children lookup).
 */
const TABLES_WITH_CHILD_ID = new Set([
  'montree_child_progress',
  'montree_media',
  'montree_weekly_reports',
  'montree_behavioral_observations',
  'montree_guru_corrections',
  'montree_child_patterns',
  'montree_media_children',
  'montree_event_attendance',
]);

/**
 * Tables that are global references (not school-scoped, read-only).
 */
const GLOBAL_TABLES = new Set([
  'montree_works',
  'montree_feature_toggles',
  'montree_guru_brain',
]);

/**
 * Execute a tool by name. All tools automatically scope queries to the given schoolId.
 */
export async function executePrincipalTool(
  toolName: string,
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>,
  schoolId: string
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'query_school_data':
        return await executeQuerySchoolData(input, supabase, allowedTables, schoolId);
      case 'query_school_stats':
        return await executeQuerySchoolStats(input, supabase, allowedTables, schoolId);
      case 'search_school':
        return await executeSearchSchool(input, supabase, schoolId);
      case 'get_school_overview':
        return await executeGetSchoolOverview(supabase, schoolId);
      case 'get_classroom_detail':
        return await executeGetClassroomDetail(input, supabase, schoolId);
      case 'get_student_detail':
        return await executeGetStudentDetail(input, supabase, schoolId);
      case 'get_teacher_list':
        return await executeGetTeacherList(supabase, schoolId);
      case 'toggle_school_feature':
        return await executeToggleSchoolFeature(input, supabase, schoolId);
      case 'get_progress_summary':
        return await executeGetProgressSummary(input, supabase, schoolId);
      case 'get_guru_usage':
        return await executeGetGuruUsage(input, supabase, schoolId);
      case 'get_parent_engagement':
        return await executeGetParentEngagement(input, supabase, schoolId);
      case 'get_media_summary':
        return await executeGetMediaSummary(input, supabase, schoolId);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown execution error';
    console.error(`[Principal Guru] Tool execution error (${toolName}):`, msg);
    return { success: false, error: `Execution error: ${msg}` };
  }
}

// ============================================================
// Tool Implementations
// ============================================================

async function executeQuerySchoolData(
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>,
  schoolId: string
): Promise<ToolResult> {
  const table = String(input.table || '');
  if (!validateTable(table, allowedTables)) {
    return { success: false, error: `Table "${table}" is not accessible.` };
  }

  const columns = Array.isArray(input.columns) ? input.columns.join(',') : '*';
  const limit = clampParam(input.limit, 1, 200, 50);

  let query = supabase.from(table).select(columns);

  // Apply school scoping
  query = await applyScopeFilter(query, table, supabase, schoolId);

  // Apply user filters
  const filters = Array.isArray(input.filters) ? input.filters : [];
  for (const f of filters) {
    const result = applyFilter(query, f as { column: string; op: string; value?: unknown });
    if (result) query = result;
  }

  // Apply ordering
  if (typeof input.order_by === 'string' && input.order_by.length > 0) {
    const desc = input.order_by.startsWith('-');
    const col = desc ? input.order_by.slice(1) : input.order_by;
    if (col.length > 0) {
      query = query.order(col, { ascending: !desc });
    }
  }

  query = query.limit(limit);
  const { data, error } = await query;

  if (error) return { success: false, error: error.message };
  return { success: true, data: { rows: data || [], count: (data || []).length } };
}

async function executeQuerySchoolStats(
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>,
  schoolId: string
): Promise<ToolResult> {
  const table = String(input.table || '');
  if (!validateTable(table, allowedTables)) {
    return { success: false, error: `Table "${table}" is not accessible.` };
  }

  const aggregate = String(input.aggregate || 'count');
  const column = typeof input.column === 'string' ? input.column : undefined;
  const groupBy = typeof input.group_by === 'string' ? input.group_by : undefined;

  // Validate that column is provided for aggregates that need it
  if (['sum', 'avg', 'min', 'max'].includes(aggregate) && !column) {
    return { success: false, error: `The "${aggregate}" aggregate requires a "column" parameter.` };
  }

  // For count, we fetch rows and count client-side (Supabase doesn't have built-in aggregation)
  // For other aggregates, fetch the column values and compute
  const selectCol = groupBy
    ? `${groupBy}${column ? `,${column}` : ''}`
    : column || '*';

  let query = supabase.from(table).select(selectCol);

  // Apply school scoping
  query = await applyScopeFilter(query, table, supabase, schoolId);

  // Apply user filters
  const filters = Array.isArray(input.filters) ? input.filters : [];
  for (const f of filters) {
    const result = applyFilter(query, f as { column: string; op: string; value?: unknown });
    if (result) query = result;
  }

  query = query.limit(500);
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const rows = data || [];

  if (groupBy) {
    // Group and aggregate
    const groups: Record<string, number[]> = {};
    for (const row of rows) {
      const key = String((row as Record<string, unknown>)[groupBy] || 'null');
      if (!groups[key]) groups[key] = [];
      if (column && (row as Record<string, unknown>)[column] != null) {
        groups[key].push(Number((row as Record<string, unknown>)[column]));
      } else {
        groups[key].push(0);
      }
    }

    const result: Record<string, number> = {};
    for (const [key, values] of Object.entries(groups)) {
      result[key] = computeAggregate(aggregate, values);
    }
    return { success: true, data: { grouped: result, total_rows: rows.length } };
  }

  // Simple aggregate
  const values = column
    ? rows.map((r) => Number((r as Record<string, unknown>)[column] || 0))
    : rows.map(() => 1);

  return {
    success: true,
    data: { result: computeAggregate(aggregate, values), total_rows: rows.length },
  };
}

function computeAggregate(agg: string, values: number[]): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'count':
      return values.length;
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return values.length;
  }
}

async function executeSearchSchool(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const term = String(input.search_term || '').trim();
  if (!term) return { success: false, error: 'search_term is required' };

  // Sanitize for PostgREST filter safety — escape dots, commas, parens that could inject filter syntax
  const sanitized = term.replace(/[.,()]/g, '');
  const pattern = `%${sanitized}%`;
  const classroomIds = await getSchoolClassroomIds(supabase, schoolId);

  const results: Record<string, unknown[]> = {};

  // Search teachers — use 3 separate ilike queries instead of .or() to avoid filter injection
  const { data: teachersByName, error: t1Err } = await supabase
    .from('montree_teachers')
    .select('id, name, email, role, login_code, last_login_at')
    .eq('school_id', schoolId)
    .ilike('name', pattern)
    .limit(10);
  const { data: teachersByEmail, error: t2Err } = await supabase
    .from('montree_teachers')
    .select('id, name, email, role, login_code, last_login_at')
    .eq('school_id', schoolId)
    .ilike('email', pattern)
    .limit(10);
  const { data: teachersByCode, error: t3Err } = await supabase
    .from('montree_teachers')
    .select('id, name, email, role, login_code, last_login_at')
    .eq('school_id', schoolId)
    .ilike('login_code', pattern)
    .limit(10);
  if (t1Err) console.error('[Principal Guru] Teacher name search error:', t1Err.message);
  if (t2Err) console.error('[Principal Guru] Teacher email search error:', t2Err.message);
  if (t3Err) console.error('[Principal Guru] Teacher code search error:', t3Err.message);
  // Deduplicate by id
  const teacherMap = new Map<string, unknown>();
  for (const t of [...(teachersByName || []), ...(teachersByEmail || []), ...(teachersByCode || [])]) {
    teacherMap.set((t as { id: string }).id, t);
  }
  const teachers = Array.from(teacherMap.values());
  if (teachers.length > 0) results.teachers = teachers;

  // Search classrooms
  const { data: classrooms, error: classErr } = await supabase
    .from('montree_classrooms')
    .select('id, name, teacher_count, student_count, created_at')
    .eq('school_id', schoolId)
    .ilike('name', pattern)
    .limit(10);
  if (classErr) console.error('[Principal Guru] Classroom search error:', classErr.message);
  if (classrooms && classrooms.length > 0) results.classrooms = classrooms;

  // Search children (via classroom scoping)
  if (classroomIds.length > 0) {
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, classroom_id, name, date_of_birth, is_active')
      .in('classroom_id', classroomIds)
      .ilike('name', pattern)
      .limit(20);
    if (childErr) console.error('[Principal Guru] Children search error:', childErr.message);
    if (children && children.length > 0) results.children = children;
  }

  const totalFound = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  return {
    success: true,
    data: { search_term: term, total_found: totalFound, results },
  };
}

async function executeGetSchoolOverview(
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const [
    schoolRes,
    classroomsRes,
    teachersRes,
    featuresRes,
  ] = await Promise.all([
    supabase.from('montree_schools').select('*').eq('id', schoolId).maybeSingle(),
    supabase.from('montree_classrooms').select('id, name, teacher_count, student_count').eq('school_id', schoolId),
    supabase.from('montree_teachers').select('id, name, role, last_login_at, guru_plan').eq('school_id', schoolId),
    supabase.from('montree_school_features').select('feature_name, enabled').eq('school_id', schoolId),
  ]);

  if (schoolRes.error) return { success: false, error: schoolRes.error.message };
  if (!schoolRes.data) return { success: false, error: 'School not found' };
  if (classroomsRes.error) console.error('[Principal Guru] Classrooms query error:', classroomsRes.error.message);
  if (teachersRes.error) console.error('[Principal Guru] Teachers query error:', teachersRes.error.message);
  if (featuresRes.error) console.error('[Principal Guru] Features query error:', featuresRes.error.message);

  const classrooms = classroomsRes.data || [];
  const teachers = teachersRes.data || [];
  const features = featuresRes.data || [];

  const totalStudents = classrooms.reduce(
    (sum: number, c: { student_count?: number }) => sum + (c.student_count || 0),
    0
  );

  // Get child IDs for deeper stats
  const classroomIds = classrooms.map((c: { id: string }) => c.id);
  let recentGuruCount = 0;
  let recentMediaCount = 0;
  let recentReportCount = 0;

  if (classroomIds.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // montree_guru_interactions has classroom_id, not school_id — scope via classroomIds
    const [guruRes, mediaChildIds] = await Promise.all([
      supabase
        .from('montree_guru_interactions')
        .select('id', { count: 'exact', head: true })
        .in('classroom_id', classroomIds)
        .gte('asked_at', sevenDaysAgo),
      supabase
        .from('montree_children')
        .select('id')
        .in('classroom_id', classroomIds),
    ]);

    if (guruRes.error) console.error('[Principal Guru] Guru interactions query error:', guruRes.error.message);
    if (mediaChildIds.error) console.error('[Principal Guru] Children query error:', mediaChildIds.error.message);
    recentGuruCount = guruRes.count || 0;
    const childIds = (mediaChildIds.data || []).map((c: { id: string }) => c.id);

    if (childIds.length > 0) {
      const [mediaRes, reportRes] = await Promise.all([
        supabase
          .from('montree_media')
          .select('id', { count: 'exact', head: true })
          .in('child_id', childIds)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('montree_weekly_reports')
          .select('id', { count: 'exact', head: true })
          .in('child_id', childIds)
          .gte('created_at', sevenDaysAgo),
      ]);
      if (mediaRes.error) console.error('[Principal Guru] Media query error:', mediaRes.error.message);
      if (reportRes.error) console.error('[Principal Guru] Reports query error:', reportRes.error.message);
      recentMediaCount = mediaRes.count || 0;
      recentReportCount = reportRes.count || 0;
    }
  }

  return {
    success: true,
    data: {
      school: schoolRes.data,
      summary: {
        classrooms: classrooms.length,
        teachers: teachers.length,
        total_students: totalStudents,
        enabled_features: features.filter((f: { enabled: boolean }) => f.enabled).map((f: { feature_name: string }) => f.feature_name),
      },
      last_7_days: {
        guru_interactions: recentGuruCount,
        photos_uploaded: recentMediaCount,
        reports_generated: recentReportCount,
      },
      classrooms,
      teachers: teachers.map((t: Record<string, unknown>) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        last_login_at: t.last_login_at,
        guru_plan: t.guru_plan,
      })),
      features,
    },
  };
}

async function executeGetClassroomDetail(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const classroomId = String(input.classroom_id || '');
  if (!classroomId) return { success: false, error: 'classroom_id is required' };

  // Verify classroom belongs to this school
  const { data: classroom, error: clErr } = await supabase
    .from('montree_classrooms')
    .select('*')
    .eq('id', classroomId)
    .eq('school_id', schoolId)
    .maybeSingle();

  if (clErr) return { success: false, error: clErr.message };
  if (!classroom) return { success: false, error: 'Classroom not found in your school' };

  const [teachersRes, childrenRes, invitesRes] = await Promise.all([
    supabase.from('montree_teachers').select('id, name, email, role, last_login_at, guru_plan').eq('school_id', schoolId),
    supabase.from('montree_children').select('id, name, date_of_birth, is_active, created_at').eq('classroom_id', classroomId).order('name'),
    supabase.from('montree_parent_invites').select('id, invite_code, email_sent_to, created_at, accessed_at').eq('classroom_id', classroomId).limit(20),
  ]);

  if (teachersRes.error) console.error('[Principal Guru] Teachers query error:', teachersRes.error.message);
  if (childrenRes.error) console.error('[Principal Guru] Children query error:', childrenRes.error.message);
  if (invitesRes.error) console.error('[Principal Guru] Invites query error:', invitesRes.error.message);

  const children = childrenRes.data || [];
  const childIds = children.map((c: { id: string }) => c.id);

  let progressSummary: Record<string, unknown> = {};
  let recentMediaCount = 0;

  if (childIds.length > 0) {
    const [progressRes, mediaRes] = await Promise.all([
      supabase.from('montree_child_progress').select('child_id, status').in('child_id', childIds),
      supabase
        .from('montree_media')
        .select('id', { count: 'exact', head: true })
        .in('child_id', childIds),
    ]);

    if (progressRes.error) console.error('[Principal Guru] Progress query error:', progressRes.error.message);
    if (mediaRes.error) console.error('[Principal Guru] Media count query error:', mediaRes.error.message);

    const progressData = progressRes.data || [];
    progressSummary = {
      mastered: progressData.filter((p: { status: string }) => p.status === 'mastered').length,
      practicing: progressData.filter((p: { status: string }) => p.status === 'practicing').length,
      presented: progressData.filter((p: { status: string }) => p.status === 'presented').length,
      total_entries: progressData.length,
    };
    recentMediaCount = mediaRes.count || 0;
  }

  return {
    success: true,
    data: {
      classroom,
      teachers: teachersRes.data || [],
      children,
      student_count: children.length,
      progress_summary: progressSummary,
      total_photos: recentMediaCount,
      parent_invites: invitesRes.data || [],
    },
  };
}

async function executeGetStudentDetail(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const childId = String(input.child_id || '');
  if (!childId) return { success: false, error: 'child_id is required' };

  // Verify student belongs to this school via classroom
  const classroomIds = await getSchoolClassroomIds(supabase, schoolId);
  const { data: child, error: chErr } = await supabase
    .from('montree_children')
    .select('*')
    .eq('id', childId)
    .in('classroom_id', classroomIds)
    .maybeSingle();

  if (chErr) return { success: false, error: chErr.message };
  if (!child) return { success: false, error: 'Student not found in your school' };

  const [progressRes, mediaRes, observationsRes, reportsRes, guruRes] = await Promise.all([
    supabase.from('montree_child_progress').select('work_id, status, mastery_confidence, updated_at, is_extra').eq('child_id', childId),
    supabase.from('montree_media').select('id, work_id, media_type, created_at, caption').eq('child_id', childId).order('created_at', { ascending: false }).limit(20),
    supabase.from('montree_behavioral_observations').select('id, observation_text, area, created_at, observation_type').eq('child_id', childId).order('created_at', { ascending: false }).limit(10),
    supabase.from('montree_weekly_reports').select('id, created_at, locale, areas_completed').eq('child_id', childId).order('created_at', { ascending: false }).limit(5),
    supabase.from('montree_guru_interactions').select('id, question_type, model_used, asked_at').eq('child_id', childId).order('asked_at', { ascending: false }).limit(10),
  ]);

  if (progressRes.error) console.error('[Principal Guru] Student progress query error:', progressRes.error.message);
  if (mediaRes.error) console.error('[Principal Guru] Student media query error:', mediaRes.error.message);
  if (observationsRes.error) console.error('[Principal Guru] Student observations query error:', observationsRes.error.message);
  if (reportsRes.error) console.error('[Principal Guru] Student reports query error:', reportsRes.error.message);
  if (guruRes.error) console.error('[Principal Guru] Student guru interactions query error:', guruRes.error.message);

  const progress = progressRes.data || [];
  const byStatus = {
    mastered: progress.filter((p: { status: string }) => p.status === 'mastered').length,
    practicing: progress.filter((p: { status: string }) => p.status === 'practicing').length,
    presented: progress.filter((p: { status: string }) => p.status === 'presented').length,
  };

  return {
    success: true,
    data: {
      child,
      progress_summary: byStatus,
      total_works_tracked: progress.length,
      progress_detail: progress.slice(0, 50),
      recent_photos: mediaRes.data || [],
      observations: observationsRes.data || [],
      reports: reportsRes.data || [],
      guru_interactions: guruRes.data || [],
    },
  };
}

async function executeGetTeacherList(
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('montree_teachers')
    .select('id, name, email, role, login_code, last_login_at, guru_plan, guru_subscription_status, created_at')
    .eq('school_id', schoolId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: { teachers: data || [], count: (data || []).length } };
}

async function executeToggleSchoolFeature(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const featureName = String(input.feature_name || '').trim();
  const enabled = Boolean(input.enabled);

  if (!featureName) return { success: false, error: 'feature_name is required' };

  // Verify feature exists in global toggles
  const { data: toggle, error: tErr } = await supabase
    .from('montree_feature_toggles')
    .select('feature_name, description')
    .eq('feature_name', featureName)
    .maybeSingle();

  if (tErr) return { success: false, error: tErr.message };
  if (!toggle) return { success: false, error: `Feature "${featureName}" does not exist` };

  // Upsert school feature
  const { error: upsertErr } = await supabase
    .from('montree_school_features')
    .upsert(
      {
        school_id: schoolId,
        feature_name: featureName,
        enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
      },
      { onConflict: 'school_id,feature_name' }
    );

  if (upsertErr) return { success: false, error: upsertErr.message };

  return {
    success: true,
    data: {
      feature: featureName,
      enabled,
      description: toggle.description,
    },
  };
}

async function executeGetProgressSummary(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const classroomFilter = typeof input.classroom_id === 'string' ? input.classroom_id : null;
  const areaFilter = typeof input.area === 'string' ? input.area : null;

  // Get children for this school
  let classroomIds: string[];
  if (classroomFilter) {
    // Verify classroom belongs to school
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomFilter)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!cl) return { success: false, error: 'Classroom not found in your school' };
    classroomIds = [classroomFilter];
  } else {
    classroomIds = await getSchoolClassroomIds(supabase, schoolId);
  }

  if (classroomIds.length === 0) {
    return { success: true, data: { message: 'No classrooms found', summary: {} } };
  }

  const { data: children, error: childrenErr } = await supabase
    .from('montree_children')
    .select('id, classroom_id, name')
    .in('classroom_id', classroomIds);

  if (childrenErr) console.error('[Principal Guru] Progress summary children query error:', childrenErr.message);

  const childIds = (children || []).map((c: { id: string }) => c.id);
  if (childIds.length === 0) {
    return { success: true, data: { message: 'No students found', summary: {} } };
  }

  // Get progress with work info for area filtering
  let progressQuery = supabase
    .from('montree_child_progress')
    .select('child_id, status, work_id')
    .in('child_id', childIds);

  const { data: progress } = await progressQuery;
  const progressData = progress || [];

  // If area filter, we need to look up work areas
  let filteredProgress = progressData;
  if (areaFilter) {
    const workIds = [...new Set(progressData.map((p: { work_id: string }) => p.work_id).filter(Boolean))];
    if (workIds.length > 0) {
      const { data: works } = await supabase
        .from('montree_works')
        .select('id, area')
        .in('id', workIds)
        .eq('area', areaFilter);
      const matchingWorkIds = new Set((works || []).map((w: { id: string }) => w.id));
      filteredProgress = progressData.filter((p: { work_id: string }) => matchingWorkIds.has(p.work_id));
    }
  }

  const summary = {
    total_students: childIds.length,
    total_progress_entries: filteredProgress.length,
    mastered: filteredProgress.filter((p: { status: string }) => p.status === 'mastered').length,
    practicing: filteredProgress.filter((p: { status: string }) => p.status === 'practicing').length,
    presented: filteredProgress.filter((p: { status: string }) => p.status === 'presented').length,
    area_filter: areaFilter || 'all',
    classroom_filter: classroomFilter || 'all',
  };

  return { success: true, data: summary };
}

async function executeGetGuruUsage(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const days = clampParam(input.days, 1, 90, 30);
  const classroomFilter = typeof input.classroom_id === 'string' ? input.classroom_id : null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // montree_guru_interactions has classroom_id, not school_id — scope via classroom lookup
  const allClassroomIds = await getSchoolClassroomIds(supabase, schoolId);
  if (allClassroomIds.length === 0) {
    return { success: true, data: { total_interactions: 0, by_type: {}, by_model: {}, classrooms: [], message: 'No classrooms found' } };
  }

  let query = supabase
    .from('montree_guru_interactions')
    .select('id, child_id, question_type, model_used, processing_time_ms, asked_at, classroom_id')
    .in('classroom_id', allClassroomIds)
    .gte('asked_at', since)
    .order('asked_at', { ascending: false })
    .limit(200);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const interactions = data || [];

  // If classroom filter, verify it belongs to this school then get children
  let filtered = interactions;
  if (classroomFilter) {
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomFilter)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!cl) return { success: false, error: 'Classroom not found in your school' };

    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', classroomFilter);
    if (childrenErr) console.error('[Principal Guru] Guru usage children filter error:', childrenErr.message);
    const childIds = new Set((children || []).map((c: { id: string }) => c.id));
    filtered = interactions.filter((i: { child_id: string | null }) => i.child_id && childIds.has(i.child_id));
  }

  // Aggregate by question_type
  const byType: Record<string, number> = {};
  for (const i of filtered) {
    const qt = String((i as Record<string, unknown>).question_type || 'unknown');
    byType[qt] = (byType[qt] || 0) + 1;
  }

  // Aggregate by model
  const byModel: Record<string, number> = {};
  for (const i of filtered) {
    const m = String((i as Record<string, unknown>).model_used || 'unknown');
    byModel[m] = (byModel[m] || 0) + 1;
  }

  return {
    success: true,
    data: {
      period_days: days,
      total_interactions: filtered.length,
      by_question_type: byType,
      by_model: byModel,
      recent_10: filtered.slice(0, 10),
    },
  };
}

async function executeGetParentEngagement(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const classroomFilter = typeof input.classroom_id === 'string' ? input.classroom_id : null;

  let classroomIds: string[];
  if (classroomFilter) {
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomFilter)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!cl) return { success: false, error: 'Classroom not found in your school' };
    classroomIds = [classroomFilter];
  } else {
    classroomIds = await getSchoolClassroomIds(supabase, schoolId);
  }

  if (classroomIds.length === 0) {
    return { success: true, data: { message: 'No classrooms found' } };
  }

  const { data: invites } = await supabase
    .from('montree_parent_invites')
    .select('id, classroom_id, invite_code, email_sent_to, created_at, accessed_at')
    .in('classroom_id', classroomIds);

  const inviteData = invites || [];
  const totalSent = inviteData.length;
  const totalAccessed = inviteData.filter((i: { accessed_at: string | null }) => i.accessed_at != null).length;

  // Get children for report count
  const { data: children } = await supabase
    .from('montree_children')
    .select('id')
    .in('classroom_id', classroomIds);
  const childIds = (children || []).map((c: { id: string }) => c.id);

  let reportCount = 0;
  if (childIds.length > 0) {
    const { count } = await supabase
      .from('montree_weekly_reports')
      .select('id', { count: 'exact', head: true })
      .in('child_id', childIds);
    reportCount = count || 0;
  }

  return {
    success: true,
    data: {
      invites_sent: totalSent,
      invites_accessed: totalAccessed,
      access_rate: totalSent > 0 ? `${Math.round((totalAccessed / totalSent) * 100)}%` : 'N/A',
      reports_generated: reportCount,
      by_classroom: classroomIds.map((cid: string) => {
        const classInvites = inviteData.filter((i: { classroom_id: string }) => i.classroom_id === cid);
        return {
          classroom_id: cid,
          invites_sent: classInvites.length,
          invites_accessed: classInvites.filter((i: { accessed_at: string | null }) => i.accessed_at != null).length,
        };
      }),
    },
  };
}

async function executeGetMediaSummary(
  input: ToolInput,
  supabase: SupabaseClient,
  schoolId: string
): Promise<ToolResult> {
  const days = clampParam(input.days, 1, 90, 30);
  const classroomFilter = typeof input.classroom_id === 'string' ? input.classroom_id : null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let classroomIds: string[];
  if (classroomFilter) {
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomFilter)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (!cl) return { success: false, error: 'Classroom not found in your school' };
    classroomIds = [classroomFilter];
  } else {
    classroomIds = await getSchoolClassroomIds(supabase, schoolId);
  }

  if (classroomIds.length === 0) {
    return { success: true, data: { message: 'No classrooms found' } };
  }

  const { data: children } = await supabase
    .from('montree_children')
    .select('id, classroom_id, name')
    .in('classroom_id', classroomIds);

  const childIds = (children || []).map((c: { id: string }) => c.id);
  if (childIds.length === 0) {
    return { success: true, data: { message: 'No students found', total_photos: 0 } };
  }

  const [totalRes, recentRes] = await Promise.all([
    supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .in('child_id', childIds),
    supabase
      .from('montree_media')
      .select('id, child_id, work_id, created_at')
      .in('child_id', childIds)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const recentPhotos = recentRes.data || [];
  const tagged = recentPhotos.filter((p: { work_id: string | null }) => p.work_id != null).length;
  const untagged = recentPhotos.length - tagged;

  return {
    success: true,
    data: {
      total_photos_all_time: totalRes.count || 0,
      period_days: days,
      photos_in_period: recentPhotos.length,
      tagged: tagged,
      untagged: untagged,
      tag_rate: recentPhotos.length > 0 ? `${Math.round((tagged / recentPhotos.length) * 100)}%` : 'N/A',
    },
  };
}

// ============================================================
// Scoping Helper
// ============================================================

/**
 * Apply school scoping to a query based on table type.
 * Tables with school_id get filtered directly.
 * Tables with classroom_id get filtered via classroom lookup.
 * Tables with child_id get filtered via classroom → child lookup.
 * Global tables are returned unmodified.
 */
async function applyScopeFilter(
  query: any,
  table: string,
  supabase: SupabaseClient,
  schoolId: string
): Promise<any> {
  if (TABLES_WITH_SCHOOL_ID.has(table)) {
    return query.eq('school_id', schoolId);
  }

  if (TABLES_WITH_CLASSROOM_ID.has(table)) {
    const classroomIds = await getSchoolClassroomIds(supabase, schoolId);
    if (classroomIds.length === 0) return query.eq('classroom_id', 'NONE');
    return query.in('classroom_id', classroomIds);
  }

  if (TABLES_WITH_CHILD_ID.has(table)) {
    const classroomIds = await getSchoolClassroomIds(supabase, schoolId);
    if (classroomIds.length === 0) return query.eq('child_id', 'NONE');
    const { data, error } = await supabase
      .from('montree_children')
      .select('id')
      .in('classroom_id', classroomIds);
    if (error) console.error('[Principal Guru] applyScopeFilter children query error:', error.message);
    const childIds = (data || []).map((c: { id: string }) => c.id);
    if (childIds.length === 0) return query.eq('child_id', 'NONE');
    return query.in('child_id', childIds);
  }

  // Global tables — no scoping needed
  return query;
}
