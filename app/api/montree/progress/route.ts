// /api/montree/progress/route.ts
// GET child progress - DEFENSIVE: never returns 500, always returns usable data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { enrichWithChineseNames } from '@/lib/montree/curriculum-loader';

// Empty response shape — used as fallback so client always gets valid data
const EMPTY_RESPONSE = {
  progress: [],
  stats: { presented: 0, practicing: 0, mastered: 0 },
  byArea: {},
  total: 0,
};

export async function GET(request: NextRequest) {
  // --- AUTH ---
  // Wrapped separately so auth errors return 401, not 500
  let auth;
  try {
    auth = await verifySchoolRequest(request);
  } catch {
    return NextResponse.json({ error: 'Auth failed', ...EMPTY_RESPONSE }, { status: 401 });
  }
  if (auth instanceof NextResponse) return auth; // 401 from verifySchoolRequest

  // --- PARAMS ---
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  // --- SECURITY: Verify child belongs to this user's school ---
  try {
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied', ...EMPTY_RESPONSE }, { status: 403 });
    }
  } catch {
    // If verification fails, return empty rather than leaking data
    return NextResponse.json(EMPTY_RESPONSE);
  }

  // --- SUPABASE CLIENT ---
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    // ENV VARS MISSING — this is the most common cause of persistent 500s
    // In dev: check .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PROGRESS API] Missing env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
    }
    // Return empty data instead of 500 — page still loads, just no works
    return NextResponse.json(EMPTY_RESPONSE);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- FETCH PROGRESS (main query — if this fails, return empty) ---
  let progress: any[] = [];
  try {
    let query = supabase
      .from('montree_child_work_progress')
      .select('*')
      .eq('child_id', childId);

    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    if (fromDate) query = query.gte('updated_at', fromDate);
    if (toDate) query = query.lte('updated_at', toDate);

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      // Table might not exist or query failed — try alternate table name
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PROGRESS API] montree_child_work_progress query error:', error.message, error.code);
        console.warn('[PROGRESS API] Trying montree_child_progress fallback...');
      }

      // Fallback: try the other table name
      const fallback = await supabase
        .from('montree_child_progress')
        .select('*')
        .eq('child_id', childId)
        .order('updated_at', { ascending: false });

      if (fallback.error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PROGRESS API] Fallback also failed:', fallback.error.message);
        }
        return NextResponse.json(EMPTY_RESPONSE);
      }
      progress = fallback.data || [];
    } else {
      progress = data || [];
    }
  } catch {
    return NextResponse.json(EMPTY_RESPONSE);
  }

  // --- FETCH FOCUS WORKS (optional — graceful fallback) ---
  const focusMap = new Map<string, string>();
  try {
    const { data: focusWorks, error: focusError } = await supabase
      .from('montree_child_focus_works')
      .select('area, work_name')
      .eq('child_id', childId);

    if (!focusError && focusWorks) {
      for (const fw of focusWorks) {
        focusMap.set(fw.area, fw.work_name?.toLowerCase());
      }
    }
  } catch {
    // Table may not exist — continue without focus flags
  }

  // --- FETCH EXTRAS (optional — graceful fallback) ---
  const extrasSet = new Set<string>();
  try {
    const { data: extras, error: extrasError } = await supabase
      .from('montree_child_extras')
      .select('work_name')
      .eq('child_id', childId);

    if (!extrasError && extras) {
      for (const ex of extras) {
        extrasSet.add(ex.work_name?.toLowerCase());
      }
    }
  } catch {
    // Table may not exist — continue without extras flags
  }

  // --- CALCULATE STATS ---
  const stats = { presented: 0, practicing: 0, mastered: 0 };
  const byArea: Record<string, any[]> = {};

  for (const p of progress) {
    let statusKey = '';
    if (p.status === 1 || p.status === 'presented') {
      statusKey = 'presented';
      stats.presented++;
    } else if (p.status === 2 || p.status === 'practicing') {
      statusKey = 'practicing';
      stats.practicing++;
    } else if (p.status === 3 || p.status === 'mastered') {
      statusKey = 'mastered';
      stats.mastered++;
    }

    const area = p.area || 'other';
    if (!byArea[area]) byArea[area] = [];

    const focusWorkName = focusMap.get(area);
    const isFocus = focusWorkName === p.work_name?.toLowerCase();
    const isExtra = extrasSet.has(p.work_name?.toLowerCase());
    byArea[area].push({ ...p, statusNormalized: statusKey, is_focus: isFocus, is_extra: isExtra });
  }

  // Add flags to progress array
  const progressWithFlags = progress.map(p => {
    const area = p.area || 'other';
    const focusWorkName = focusMap.get(area);
    const isFocus = focusWorkName === p.work_name?.toLowerCase();
    const isExtra = extrasSet.has(p.work_name?.toLowerCase());
    return { ...p, is_focus: isFocus, is_extra: isExtra };
  });

  // --- OPTIONAL: Behavioral observations ---
  const includeObservations = searchParams.get('include_observations') === 'true';
  let observations: unknown[] = [];
  let workNotes: unknown[] = [];

  if (includeObservations) {
    try {
      const { data: obs } = await supabase
        .from('montree_behavioral_observations')
        .select('id, behavior_description, antecedent, consequence, environmental_notes, observed_at, time_of_day, activity_during')
        .eq('child_id', childId)
        .order('observed_at', { ascending: false })
        .limit(50);
      observations = obs || [];
    } catch { /* graceful */ }

    try {
      const { data: sessions } = await supabase
        .from('montree_work_sessions')
        .select('id, work_name, area, notes, observed_at, teacher_id')
        .eq('child_id', childId)
        .not('notes', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(200);
      workNotes = sessions || [];
    } catch { /* graceful */ }
  }

  // Enrich work names with Chinese translations from curriculum JSON
  const enrichedProgress = enrichWithChineseNames(progressWithFlags);
  const enrichedByArea: Record<string, any[]> = {};
  for (const [area, works] of Object.entries(byArea)) {
    enrichedByArea[area] = enrichWithChineseNames(works);
  }

  return NextResponse.json({
    progress: enrichedProgress,
    stats,
    byArea: enrichedByArea,
    total: progress.length,
    ...(includeObservations ? { observations, workNotes } : {}),
  });
}
