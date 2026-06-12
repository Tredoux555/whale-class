// /api/montree/progress/route.ts
// GET child progress - DEFENSIVE: never returns 500, always returns usable data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { enrichWithChineseNames } from '@/lib/montree/curriculum-loader';
import { buildLocalizedSelect } from '@/lib/montree/i18n/db-helpers';

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
  // We hoist classroomId out so the curriculum-localized-names query can join
  // the parallel batch below instead of running sequentially after it.
  let classroomId: string | undefined;
  try {
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied', ...EMPTY_RESPONSE }, { status: 403 });
    }
    classroomId = access.classroomId;
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
  // Index map (kept consistent with results unpacking below):
  //   0 progress
  //   1 focus works
  //   2 extras
  //   3 classroom curriculum (for localized names) — only if classroomId known
  //   4 observations            (only if includeObservations)
  //   5 work sessions / notes   (only if includeObservations)
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

  // Curriculum localized names — moved into the parallel batch (used to be a
  // sequential SELECT after the batch returned, costing 200-500ms on rows with
  // 300+ works). Skipped when classroomId is missing (extremely rare — would
  // mean the access check returned allowed without a classroom).
  let curriculumQueryIndex = -1;
  if (classroomId) {
    curriculumQueryIndex = queryPromises.length;
    queryPromises.push(
      supabase
        .from('montree_classroom_curriculum_works')
        .select(buildLocalizedSelect('name'))
        .eq('classroom_id', classroomId)
    );
  }

  // Add observation queries if requested
  let obsQueryIndex = -1;
  let notesQueryIndex = -1;
  if (includeObservations) {
    obsQueryIndex = queryPromises.length;
    queryPromises.push(
      supabase
        .from('montree_behavioral_observations')
        .select('id, behavior_description, antecedent, consequence, environmental_notes, observed_at, time_of_day, activity_during')
        .eq('child_id', childId)
        .order('observed_at', { ascending: false })
        .limit(50)
    );
    notesQueryIndex = queryPromises.length;
    queryPromises.push(
      // `as unknown` first: relating this builder's type to the array's
      // element union sends supabase-js's select-parser types past tsc's
      // instantiation-depth limit (TS2589). Pure type-level cast.
      supabase
        .from('montree_work_sessions')
        .select('id, work_name, area, notes, observed_at, teacher_id')
        .eq('child_id', childId)
        .not('notes', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(200) as unknown as (typeof queryPromises)[number]
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

  // Observations (optional). Indices set above when the queries were pushed.
  let observations: unknown[] = [];
  let workNotes: unknown[] = [];
  if (includeObservations) {
    if (obsQueryIndex >= 0) {
      const obsResult = results[obsQueryIndex];
      if (obsResult.status === 'fulfilled') {
        const { data: obs, error: obsError } = obsResult.value;
        if (obsError && process.env.NODE_ENV === 'development') {
          console.warn('[PROGRESS API] Observation query error:', obsError.message);
        }
        observations = obs || [];
      }
    }

    if (notesQueryIndex >= 0) {
      const notesResult = results[notesQueryIndex];
      if (notesResult.status === 'fulfilled') {
        const { data: sessions, error: notesError } = notesResult.value;
        if (notesError && process.env.NODE_ENV === 'development') {
          console.warn('[PROGRESS API] Work notes query error:', notesError.message);
        }
        workNotes = sessions || [];
      }
    }
  }

  // --- BUILD DB-SOURCED LOCALIZED NAME MAPS ---
  // Used to be a sequential SELECT-child-then-SELECT-curriculum after the
  // parallel batch (200-500ms on classrooms with hundreds of works). The
  // curriculum SELECT is now part of the parallel batch above; we just unpack
  // it here. Skipped when classroomId was unavailable (curriculumQueryIndex
  // is -1) or when the query failed.
  const dbChineseMap = new Map<string, string>();
  const dbSpanishMap = new Map<string, string>();
  const dbDeMap = new Map<string, string>();
  const dbFrMap = new Map<string, string>();
  const dbPtMap = new Map<string, string>();
  const dbNlMap = new Map<string, string>();
  const dbItMap = new Map<string, string>();
  const dbJaMap = new Map<string, string>();
  const dbKoMap = new Map<string, string>();
  const dbUkMap = new Map<string, string>();
  const dbRuMap = new Map<string, string>();
  if (curriculumQueryIndex >= 0) {
    const curriculumResult = results[curriculumQueryIndex];
    if (curriculumResult.status === 'fulfilled') {
      const { data: currWorks } = curriculumResult.value;
      // Row type is dynamic because the SELECT is built at runtime, so we
      // cast to a permissive local shape. Each `name_<locale>` column is
      // optional and read defensively.
      type LocalizedWorkRow = { name: string } & Record<string, string | null | undefined>;
      for (const w of (currWorks || []) as LocalizedWorkRow[]) {
        const key = (w.name || '').toLowerCase().trim();
        if (!key) continue;
        if (w.name_chinese) dbChineseMap.set(key, w.name_chinese);
        if (w.name_es) dbSpanishMap.set(key, w.name_es);
        if (w.name_de) dbDeMap.set(key, w.name_de);
        if (w.name_fr) dbFrMap.set(key, w.name_fr);
        if (w.name_pt) dbPtMap.set(key, w.name_pt);
        if (w.name_nl) dbNlMap.set(key, w.name_nl);
        if (w.name_it) dbItMap.set(key, w.name_it);
        if (w.name_ja) dbJaMap.set(key, w.name_ja);
        if (w.name_ko) dbKoMap.set(key, w.name_ko);
        if (w.name_uk) dbUkMap.set(key, w.name_uk);
        if (w.name_ru) dbRuMap.set(key, w.name_ru);
      }
      // end for-loop over LocalizedWorkRow
    }
    // end if (curriculumResult.status === 'fulfilled')
  }
  // end if (curriculumQueryIndex >= 0)

  // --- ADD FLAGS AND ENRICH ONCE ---
  // Combine flags and enrich in a single pass
  // First: static JSON enrichment (270/329 works covered)
  const progressWithFlagsAndChineseNames = enrichWithChineseNames(
    progress.map(p => {
      const area = p.area || 'other';
      const focusWorkName = focusMap.get(area);
      const isFocus = focusWorkName === p.work_name?.toLowerCase();
      const isExtra = extrasSet.has(p.work_name?.toLowerCase());
      return { ...p, is_focus: isFocus, is_extra: isExtra };
    })
  ).map(p => {
    const key = p.work_name?.toLowerCase().trim() || '';
    let updated = { ...p };
    // Second pass: DB Chinese names as fallback for works not in static JSON
    if (!updated.chineseName && key) {
      const dbName = dbChineseMap.get(key);
      if (dbName) updated = { ...updated, chineseName: dbName };
    }
    // Third pass: DB Spanish + 7 new language names
    if (key) {
      const esName = dbSpanishMap.get(key);
      if (esName) updated = { ...updated, spanishName: esName };
      const deName = dbDeMap.get(key);
      if (deName) updated = { ...updated, deName };
      const frName = dbFrMap.get(key);
      if (frName) updated = { ...updated, frName };
      const ptName = dbPtMap.get(key);
      if (ptName) updated = { ...updated, ptName };
      const nlName = dbNlMap.get(key);
      if (nlName) updated = { ...updated, nlName };
      const itName = dbItMap.get(key);
      if (itName) updated = { ...updated, itName };
      const jaName = dbJaMap.get(key);
      if (jaName) updated = { ...updated, jaName };
      const koName = dbKoMap.get(key);
      if (koName) updated = { ...updated, koName };
      const ukName = dbUkMap.get(key);
      if (ukName) updated = { ...updated, ukName };
      const ruName = dbRuMap.get(key);
      if (ruName) updated = { ...updated, ruName };
    }
    return updated;
  });

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
