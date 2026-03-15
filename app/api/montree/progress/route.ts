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

  // --- BUILD QUERIES (but don't execute yet) ---
  const includeObservations = searchParams.get('include_observations') === 'true';

  // Progress query with optional date filtering
  let progressQuery = supabase
    .from('montree_child_progress')
    .select('*')
    .eq('child_id', childId);

  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');
  if (fromDate) progressQuery = progressQuery.gte('updated_at', fromDate);
  if (toDate) progressQuery = progressQuery.lte('updated_at', toDate);
  progressQuery = progressQuery.order('updated_at', { ascending: false });

  // --- EXECUTE ALL QUERIES IN PARALLEL ---
  const queryPromises = [
    progressQuery,
    supabase
      .from('montree_child_focus_works')
      .select('area, work_name')
      .eq('child_id', childId),
    supabase
      .from('montree_child_extras')
      .select('work_name')
      .eq('child_id', childId),
  ];

  // Add observation queries if requested
  if (includeObservations) {
    queryPromises.push(
      supabase
        .from('montree_behavioral_observations')
        .select('id, behavior_description, antecedent, consequence, environmental_notes, observed_at, time_of_day, activity_during')
        .eq('child_id', childId)
        .order('observed_at', { ascending: false })
        .limit(50),
      supabase
        .from('montree_work_sessions')
        .select('id, work_name, area, notes, observed_at, teacher_id')
        .eq('child_id', childId)
        .not('notes', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(200)
    );
  }

  // Execute all queries in parallel
  const results = await Promise.allSettled(queryPromises.map(q => q));

  // --- UNPACK RESULTS ---
  // Progress (required for main response)
  let progress: any[] = [];
  const progressResult = results[0];
  if (progressResult.status === 'fulfilled') {
    const { data, error } = progressResult.value;
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PROGRESS API] Query error:', error.message, error.code);
      }
      return NextResponse.json(EMPTY_RESPONSE);
    }
    progress = data || [];
  } else {
    return NextResponse.json(EMPTY_RESPONSE);
  }

  // Focus works (optional — graceful fallback)
  const focusMap = new Map<string, string>();
  const focusResult = results[1];
  if (focusResult.status === 'fulfilled') {
    const { data: focusWorks, error: focusError } = focusResult.value;
    if (!focusError && focusWorks) {
      for (const fw of focusWorks) {
        focusMap.set(fw.area, fw.work_name?.toLowerCase());
      }
    }
  }

  // Extras (optional — graceful fallback)
  const extrasSet = new Set<string>();
  const extrasResult = results[2];
  if (extrasResult.status === 'fulfilled') {
    const { data: extras, error: extrasError } = extrasResult.value;
    if (!extrasError && extras) {
      for (const ex of extras) {
        extrasSet.add(ex.work_name?.toLowerCase());
      }
    }
  }

  // Observations (optional)
  let observations: unknown[] = [];
  let workNotes: unknown[] = [];
  if (includeObservations) {
    const obsResult = results[3];
    if (obsResult.status === 'fulfilled') {
      const { data: obs, error: obsError } = obsResult.value;
      if (obsError && process.env.NODE_ENV === 'development') {
        console.warn('[PROGRESS API] Observation query error:', obsError.message);
      }
      observations = obs || [];
    }

    const notesResult = results[4];
    if (notesResult.status === 'fulfilled') {
      const { data: sessions, error: notesError } = notesResult.value;
      if (notesError && process.env.NODE_ENV === 'development') {
        console.warn('[PROGRESS API] Work notes query error:', notesError.message);
      }
      workNotes = sessions || [];
    }
  }

  // --- ADD FLAGS AND ENRICH ONCE ---
  // Combine flags and enrich in a single pass
  const progressWithFlagsAndChineseNames = enrichWithChineseNames(
    progress.map(p => {
      const area = p.area || 'other';
      const focusWorkName = focusMap.get(area);
      const isFocus = focusWorkName === p.work_name?.toLowerCase();
      const isExtra = extrasSet.has(p.work_name?.toLowerCase());
      return { ...p, is_focus: isFocus, is_extra: isExtra };
    })
  );

  // --- GROUP BY AREA from enriched progress ---
  const enrichedByArea: Record<string, any[]> = {};
  const stats = { presented: 0, practicing: 0, mastered: 0 };

  for (const p of progressWithFlagsAndChineseNames) {
    // Update stats
    if (p.status === 1 || p.status === 'presented') {
      stats.presented++;
    } else if (p.status === 2 || p.status === 'practicing') {
      stats.practicing++;
    } else if (p.status === 3 || p.status === 'mastered') {
      stats.mastered++;
    }

    // Group by area
    const area = p.area || 'other';
    if (!enrichedByArea[area]) enrichedByArea[area] = [];
    enrichedByArea[area].push(p);
  }

  const response = NextResponse.json({
    progress: progressWithFlagsAndChineseNames,
    stats,
    byArea: enrichedByArea,
    total: progress.length,
    ...(includeObservations ? { observations, workNotes } : {}),
  });
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120');
  return response;
}
