// app/api/montree/weekly-admin-docs/auto-fill/route.ts
// GET: Returns auto-generated suggestions for Weekly Summary + Plan
// from progress data + focus works. Teacher reviews and edits before saving.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import { AREA_KEYS, AREA_LABELS_EN, AREA_LABELS_ZH } from '@/lib/montree/i18n/area-labels';
import { anthropic, HAIKU_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';

// Haiku-narrated paragraph timeout — keep small. We run all children in
// parallel; if any individual call blows past this, fall back silently to
// the flat-tag string so the teacher still gets SOMETHING in the textarea.
export const maxDuration = 60;

const AREAS = AREA_KEYS;
const AREA_LABELS: Record<string, { en: string; zh: string }> = Object.fromEntries(
  AREA_KEYS.map(k => [k, { en: AREA_LABELS_EN[k], zh: AREA_LABELS_ZH[k] }])
);

interface FocusWorkRow {
  child_id: string;
  area: string;
  work_name: string;
}

interface ChildSuggestion {
  childId: string;
  childName: string;
  summaryEnglish: string;
  summaryChinese: string;
  planAreas: Record<string, string>;
  planAreasZh: Record<string, string>;
  // Internal — stripped before sending to the client. Carries the structured
  // data Haiku needs to write a narrative paragraph in the second pass.
  _narrativeContext?: {
    childWorks: Record<string, string[]>;
    childProgress: Record<string, string>;
    focus: Record<string, string>;
  };
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Feature gate
  if (!await isFeatureEnabled(getSupabase(), auth.schoolId, 'weekly_admin_docs')) {
    return NextResponse.json({ error: 'Weekly admin docs feature is not enabled' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id') || auth.classroomId;
    const weekStart = searchParams.get('week_start');
    const locale = searchParams.get('locale') || 'en';

    // Custom date range — pull data from N academic weeks BACK from
    // weekStart. Default 1 (current week only). Capped at 8 to prevent
    // runaway queries against very large media tables. Frontend ships a
    // 1-8 stepper; we re-validate here defensively.
    const weeksBackRaw = Number(searchParams.get('weeks_back') || '1');
    const weeksBack = Number.isFinite(weeksBackRaw)
      ? Math.max(1, Math.min(8, Math.floor(weeksBackRaw)))
      : 1;

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }
    if (!weekStart) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 });
    }

    // Validate weekStart is a Monday
    const parsed = new Date(`${weekStart}T00:00:00Z`);
    if (isNaN(parsed.getTime()) || parsed.getUTCDay() !== 1) {
      return NextResponse.json({ error: 'week_start must be a valid Monday date' }, { status: 400 });
    }

    // Validate not too far in future (allow +1 week for plan preparation)
    const now = new Date();
    const todayBeijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentMonday = getBeijingMonday(todayBeijing);
    const nextMondayStr = getNextMonday(currentMonday);
    if (weekStart > nextMondayStr) {
      return NextResponse.json({ error: 'week_start cannot be more than 1 week in the future' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to teacher's school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate week boundaries
    const weekEnd = new Date(parsed.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Custom-range start — when weeksBack > 1, the auto-fill window extends
    // further back. weeksBack=1 → rangeStart === weekStart (current week
    // only, original behaviour). weeksBack=N → rangeStart is (N-1) weeks
    // earlier. The end of the window is still weekEndStr (= weekStart + 7d).
    const rangeStart = new Date(parsed.getTime() - (weeksBack - 1) * 7 * 24 * 60 * 60 * 1000);
    const rangeStartStr = rangeStart.toISOString().slice(0, 10);

    // Step 1: Fetch children first (need IDs for subsequent queries)
    const childrenRes = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (childrenRes.error) {
      console.error('auto-fill: children error:', childrenRes.error.message);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    // Apply custom classroom order (matches physical seating arrangement)
    childrenRes.data = sortChildrenByCustomOrder(childrenRes.data || []);

    const children = childrenRes.data || [];
    if (children.length === 0) {
      return NextResponse.json(
        { children: [] },
        { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
      );
    }

    const childIds = children.map((c: { id: string }) => c.id);
    const childIdSet = new Set(childIds);

    // Load area UUID → canonical key mapping (UUIDs may appear in Weekly Wrap data)
    const { data: areasRaw } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId);
    const areaIdToKey = new Map<string, string>();
    for (const a of (areasRaw || []) as Array<{ id: string; area_key: string }>) {
      areaIdToKey.set(a.id, a.area_key);
    }

    // Helper: resolve any area string (UUID, canonical, or label) to canonical key
    const CANONICAL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const resolveArea = (raw: string): string => {
      if (!raw) return '';
      if (CANONICAL_AREAS.includes(raw)) return raw;
      if (areaIdToKey.has(raw)) return areaIdToKey.get(raw)!;
      const lower = raw.toLowerCase().replace(/[^a-z]/g, '');
      if (lower.includes('practical') || lower.includes('life')) return 'practical_life';
      if (lower.includes('sensor')) return 'sensorial';
      if (lower.includes('math') || lower.includes('number')) return 'mathematics';
      if (lower.includes('lang') || lower.includes('reading') || lower.includes('writing')) return 'language';
      if (lower.includes('cultur') || lower.includes('science') || lower.includes('geography')) return 'cultural';
      return raw;
    };

    // Step 2: Fetch all data sources in parallel
    const [reportsRes, focusWorksRes, mediaRes, existingNotesRes, allWorksRes, progressRes] = await Promise.all([
      // Weekly Wrap reports — parent (preferred, has works array) + teacher (fallback).
      // When weeksBack > 1, pull reports from EVERY week in the range so the
      // summary reflects multi-week activity. Same downstream dedup logic
      // (existing `if (!existing.includes(work.name)) existing.push(...)`)
      // handles works that appear in multiple weekly reports.
      supabase
        .from('montree_weekly_reports')
        .select('child_id, report_type, content')
        .eq('classroom_id', classroomId)
        .in('report_type', ['parent', 'teacher'])
        .gte('week_start', rangeStartStr)
        .lte('week_start', weekStart)
        .in('child_id', childIds),

      supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds),

      // Smart Capture photos with work_id — when weeksBack > 1, the window
      // starts at rangeStartStr instead of weekStart so multi-week summaries
      // reflect every confirmed photo across the range.
      supabase
        .from('montree_media')
        .select('id, child_id, work_id, captured_at')
        .eq('classroom_id', classroomId)
        .eq('media_type', 'photo')
        .not('work_id', 'is', null)
        // Only reflect teacher-approved activity in weekly admin docs.
        .or('identification_status.is.null,identification_status.neq.pending_review')
        .gte('captured_at', rangeStartStr)
        .lt('captured_at', weekEndStr),

      // Existing saved notes (for flat-text parsing fallback)
      supabase
        .from('montree_weekly_admin_notes')
        .select('child_id, english_text, chinese_text')
        .eq('classroom_id', classroomId)
        .eq('week_start', weekStart)
        .eq('doc_type', 'summary')
        .is('area', null),

      // All curriculum works (name → area_id for parsing flat text)
      supabase
        .from('montree_classroom_curriculum_works')
        .select('name, area_id')
        .eq('classroom_id', classroomId),

      // Child progress (P/Pr/M status per work)
      supabase
        .from('montree_child_progress')
        .select('child_id, work_name, status')
        .in('child_id', childIds),
    ]);

    if (reportsRes.error) {
      console.error('auto-fill: reports error:', reportsRes.error.message);
    }
    if (focusWorksRes.error) {
      console.error('auto-fill: focus works error:', focusWorksRes.error.message);
    }
    if (mediaRes.error) {
      console.error('auto-fill: media error:', mediaRes.error.message);
    }
    if (allWorksRes.error) {
      console.error('auto-fill: allWorks error:', allWorksRes.error.message);
    }
    if (existingNotesRes.error) {
      console.error('auto-fill: existingNotes error:', existingNotesRes.error.message);
    }
    if (progressRes.error) {
      console.error('auto-fill: progress error:', progressRes.error.message);
    }

    // Build work name → area lookup from curriculum (for flat-text parsing fallback)
    const workNameToArea = new Map<string, string>();
    for (const w of (allWorksRes.data || []) as Array<{ name: string; area_id: string }>) {
      const areaKey = areaIdToKey.get(w.area_id) || resolveArea(w.area_id);
      if (!areaKey) continue;
      workNameToArea.set(w.name.toLowerCase(), areaKey);
      // Also store without " - suffix" variants
      const base = w.name.replace(/\s*-\s*.+$/, '').trim();
      if (base !== w.name) workNameToArea.set(base.toLowerCase(), areaKey);
    }

    // Build child progress map: child_id → work_name(lower) → status
    const childProgressMap = new Map<string, Map<string, string>>();
    for (const row of (progressRes.data || []) as Array<{ child_id: string; work_name: string; status: string }>) {
      if (!childProgressMap.has(row.child_id)) childProgressMap.set(row.child_id, new Map());
      childProgressMap.get(row.child_id)!.set(row.work_name.toLowerCase(), row.status);
    }

    // Build existing saved notes by child (flat-text fallback source)
    const existingNotes = new Map<string, { en: string; zh: string }>();
    for (const note of (existingNotesRes.data || []) as Array<{ child_id: string; english_text: string | null; chinese_text: string | null }>) {
      existingNotes.set(note.child_id, {
        en: note.english_text || '',
        zh: note.chinese_text || '',
      });
    }

    // Parse saved text into area → [work names]
    // Handles TWO formats:
    //   1. Flat: "did X, Y, Z (Variant), and W this week. Next week: A."
    //   2. Already grouped: "Practical Life: X, Y\nSensorial: Z"
    function parseSavedText(text: string): Map<string, string[]> {
      const result = new Map<string, string[]>();
      if (!text) return result;

      // Detect already-grouped format (lines starting with area labels)
      const areaLabelToKey: Record<string, string> = {};
      for (const [key, labels] of Object.entries(AREA_LABELS)) {
        areaLabelToKey[labels.en.toLowerCase()] = key;
        areaLabelToKey[labels.zh] = key;
      }
      // Also recognize "Other" / "其他" from previous conversions
      areaLabelToKey['other'] = 'other';
      areaLabelToKey['其他'] = 'other';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      let isGrouped = false;
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 20) {
          const label = line.slice(0, colonIdx).trim().toLowerCase();
          if (areaLabelToKey[label]) { isGrouped = true; break; }
        }
      }

      if (isGrouped) {
        // Already area-grouped — parse each "Area: work1, work2" line
        for (const line of lines) {
          if (line.toLowerCase().startsWith('next week') || line.startsWith('下周')) continue;
          const colonIdx = line.indexOf(':');
          if (colonIdx <= 0) continue;
          const label = line.slice(0, colonIdx).trim().toLowerCase();
          const areaKey = areaLabelToKey[label];
          if (!areaKey) continue;
          // Split works by comma or 、
          const worksStr = line.slice(colonIdx + 1).trim();
          const works = worksStr.split(/[,、]\s*/).map(s => s.trim()).filter(Boolean);
          if (works.length > 0) result.set(areaKey, works);
        }
        return result;
      }

      // Flat paragraph format: "did X, Y, and Z this week. Next week: ..."
      let body = text.replace(/^did\s+/i, '').replace(/\s+this\s+week\.?\s*(Next\s+week:.*)?\s*$/i, '');
      const parts = body.split(/,\s+(?:and\s+)?|\s+and\s+/).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const lower = part.toLowerCase();
        let area = workNameToArea.get(lower);
        if (!area) {
          const base = part.replace(/\s*[\-(].*$/, '').trim().toLowerCase();
          area = workNameToArea.get(base);
        }
        if (!area) {
          // Fuzzy substring match
          for (const [name, aKey] of workNameToArea) {
            if (lower.includes(name) || name.includes(lower)) {
              area = aKey;
              break;
            }
          }
        }
        // Space-collapsed match (e.g. "chalk board" → "chalkboard")
        if (!area) {
          const collapsed = lower.replace(/\s+/g, '');
          for (const [name, aKey] of workNameToArea) {
            if (name.replace(/\s+/g, '') === collapsed) {
              area = aKey;
              break;
            }
          }
        }
        // Keep unmatched works in "other" instead of dropping them
        if (!area) area = 'other';
        if (!result.has(area)) result.set(area, []);
        const existing = result.get(area)!;
        if (!existing.includes(part)) existing.push(part);
      }
      return result;
    }

    // Build Weekly Wrap works by child: childId -> area -> [work names]
    // Prefer parent reports (have works array), fall back to teacher reports (have area_analyses)
    interface ReportWork { name: string; area: string; status?: string }
    interface AreaAnalysis { area: string; works_count?: number; narrative?: string; works?: string[] }
    const wrapWorksByChild = new Map<string, Map<string, string[]>>();
    // Extract teacher report key_insight for short summary
    const teacherKeyInsights = new Map<string, string>();
    const allReports = (reportsRes.data || []) as Array<{
      child_id: string;
      report_type: string;
      content: { works?: ReportWork[]; area_analyses?: AreaAnalysis[]; key_insight?: string };
    }>;
    // Sort so parent reports are processed first (overwrite teacher data)
    const parentReports = allReports.filter(r => r.report_type === 'parent');
    const teacherReports = allReports.filter(r => r.report_type === 'teacher');
    // Extract key_insight from teacher reports
    for (const tr of teacherReports) {
      if (tr.content?.key_insight) {
        teacherKeyInsights.set(tr.child_id, tr.content.key_insight);
      }
    }
    // Process teacher reports first, then parent overwrites
    for (const report of [...teacherReports, ...parentReports]) {
      // Parent reports have content.works; teacher reports have content.area_analyses
      const works: ReportWork[] = [...(report.content?.works || [])];
      // Extract works from teacher area_analyses if no direct works array
      if (works.length === 0 && report.content?.area_analyses) {
        for (const aa of report.content.area_analyses) {
          if (aa.works && Array.isArray(aa.works)) {
            for (const workName of aa.works) {
              works.push({ name: workName, area: aa.area });
            }
          }
        }
      }
      if (works.length === 0) continue;
      const areaMap = new Map<string, string[]>();
      for (const work of works) {
        if (!work.name || !work.area) continue;
        const resolvedArea = resolveArea(work.area);
        if (!resolvedArea) continue;
        if (!areaMap.has(resolvedArea)) areaMap.set(resolvedArea, []);
        const existing = areaMap.get(resolvedArea)!;
        if (!existing.includes(work.name)) existing.push(work.name);
      }
      if (areaMap.size > 0) {
        wrapWorksByChild.set(report.child_id, areaMap);
      }
    }
    const hasWrapData = wrapWorksByChild.size > 0;

    // Build photo-based area works (fallback): childId -> area -> [work names]
    const focusWorks = focusWorksRes.data;
    const mediaRows = (mediaRes.data || []) as Array<{ id: string; child_id: string | null; work_id: string; captured_at: string }>;
    const mediaIds = mediaRows.map(m => m.id);

    // Fetch group photo children links
    let groupChildLinks: Array<{ media_id: string; child_id: string }> = [];
    if (mediaIds.length > 0) {
      const { data: links } = await supabase
        .from('montree_media_children')
        .select('media_id, child_id')
        .in('media_id', mediaIds);
      groupChildLinks = (links || []) as Array<{ media_id: string; child_id: string }>;
    }

    // Build media_id -> set of child_ids
    const mediaChildMap = new Map<string, Set<string>>();
    for (const photo of mediaRows) {
      if (!mediaChildMap.has(photo.id)) mediaChildMap.set(photo.id, new Set());
      if (photo.child_id && childIdSet.has(photo.child_id)) {
        mediaChildMap.get(photo.id)!.add(photo.child_id);
      }
    }
    for (const link of groupChildLinks) {
      if (!mediaChildMap.has(link.media_id)) mediaChildMap.set(link.media_id, new Set());
      if (childIdSet.has(link.child_id)) {
        mediaChildMap.get(link.media_id)!.add(link.child_id);
      }
    }

    // Resolve work_ids from photos (include name_zh for Chinese locale)
    const workIds = [...new Set(mediaRows.map(m => m.work_id).filter(Boolean))];
    const workIdToName = new Map<string, { name: string; name_zh: string | null; area: string }>();
    if (workIds.length > 0) {
      const { data: worksData } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, name_zh, area_id')
        .in('id', workIds);
      for (const w of (worksData || []) as Array<{ id: string; name: string; name_zh: string | null; area_id: string }>) {
        const resolvedArea = areaIdToKey.get(w.area_id) || resolveArea(w.area_id);
        workIdToName.set(w.id, { name: w.name, name_zh: w.name_zh, area: resolvedArea });
      }
    }

    // Build work name → Chinese name lookup from all curriculum works
    const workNameToZh = new Map<string, string>();
    for (const w of workIdToName.values()) {
      if (w.name_zh) workNameToZh.set(w.name, w.name_zh);
    }
    // Also load all curriculum works for Chinese name mapping (Weekly Wrap works may not be in photos)
    const { data: allCurrWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, name_zh')
      .eq('classroom_id', classroomId)
      .not('name_zh', 'is', null);
    for (const w of (allCurrWorks || []) as Array<{ name: string; name_zh: string | null }>) {
      if (w.name_zh) workNameToZh.set(w.name, w.name_zh);
    }

    // Fuzzy Chinese name lookup: handles variants like "Chalk Board Writing - No lines" → "粉笔板书写"
    const getZhWorkName = (enName: string): string => {
      // Exact match
      const exact = workNameToZh.get(enName);
      if (exact) return exact;
      // Strip " - suffix" variants
      const base = enName.replace(/\s*-\s*.+$/, '').trim();
      if (base !== enName) {
        const baseMatch = workNameToZh.get(base);
        if (baseMatch) return baseMatch;
      }
      // Normalize spaces (e.g. "chalk board" → "chalkboard")
      const collapsed = base.toLowerCase().replace(/\s+/g, '');
      for (const [k, v] of workNameToZh) {
        if (k.toLowerCase().replace(/\s+/g, '') === collapsed) return v;
      }
      return enName; // fallback to English
    };

    const photoWorksByChild = new Map<string, Map<string, string[]>>();
    for (const photo of mediaRows) {
      const work = workIdToName.get(photo.work_id);
      if (!work) continue;
      const childIdsForPhoto = mediaChildMap.get(photo.id) || new Set();
      for (const cid of childIdsForPhoto) {
        if (!photoWorksByChild.has(cid)) photoWorksByChild.set(cid, new Map());
        const areaMap = photoWorksByChild.get(cid)!;
        if (!areaMap.has(work.area)) areaMap.set(work.area, []);
        const existing = areaMap.get(work.area)!;
        if (!existing.includes(work.name)) existing.push(work.name);
      }
    }

    // Build photo count per child per work this week (for "X sessions" context)
    const photoCountByChildWork = new Map<string, Map<string, number>>();
    for (const photo of mediaRows) {
      const work = workIdToName.get(photo.work_id);
      if (!work) continue;
      const childIdsForPhoto = mediaChildMap.get(photo.id) || new Set();
      for (const cid of childIdsForPhoto) {
        if (!photoCountByChildWork.has(cid)) photoCountByChildWork.set(cid, new Map());
        const counts = photoCountByChildWork.get(cid)!;
        counts.set(work.name, (counts.get(work.name) || 0) + 1);
      }
    }

    // Build focus works lookup
    const focusMap = new Map<string, Map<string, string>>();
    for (const fw of (focusWorks || []) as FocusWorkRow[]) {
      if (!focusMap.has(fw.child_id)) focusMap.set(fw.child_id, new Map());
      focusMap.get(fw.child_id)!.set(fw.area, fw.work_name);
    }

    // Build suggestions for each child
    const suggestions: ChildSuggestion[] = children.map((child: { id: string; name: string }) => {
      const childFocus = focusMap.get(child.id);
      // Use Weekly Wrap data (best) → photos → parse existing flat text → empty
      // Tier 3: re-parse saved flat text into area-grouped format (handles legacy "did X, Y, Z" notes)
      let childWorks = wrapWorksByChild.get(child.id) || photoWorksByChild.get(child.id);
      if (!childWorks || childWorks.size === 0) {
        const saved = existingNotes.get(child.id);
        if (saved?.en) {
          childWorks = parseSavedText(saved.en);
        }
      }
      if (!childWorks) childWorks = new Map<string, string[]>();

      // --- Plan Areas (English + Chinese) — compute first so we can append "Next week" to summary ---
      const planAreas: Record<string, string> = {};
      const planAreasZh: Record<string, string> = {};
      const nextWeekEn: string[] = [];
      const nextWeekZh: string[] = [];
      for (const area of AREAS) {
        const focusWork = childFocus?.get(area);
        if (focusWork) {
          const areaWorks = childWorks?.get(area) || [];
          const isPracticing = areaWorks.includes(focusWork);
          const suffix = isPracticing ? '-P' : '';
          planAreas[area] = `${focusWork}${suffix}`;
          // Chinese work name (with same P suffix, fuzzy matched)
          const zhName = getZhWorkName(focusWork);
          planAreasZh[area] = `${zhName}${suffix}`;
          // Collect next week focus items (only non-practicing — new presentations)
          if (!isPracticing) {
            nextWeekEn.push(focusWork);
            nextWeekZh.push(zhName);
          }
        } else {
          planAreas[area] = '';
          planAreasZh[area] = '';
        }
      }

      // --- Summary (Language only, locale-aware — custom addon, easy to revert to all areas) ---
      // Compact paragraph: "Work (P); Work (Pr). key_insight. Next week: X"
      const STATUS_SHORT_EN: Record<string, string> = { presented: 'P', practicing: 'Pr', mastered: 'M' };
      const STATUS_SHORT_ZH: Record<string, string> = { presented: '呈现', practicing: '练习', mastered: '掌握' };
      const STATUS_SHORT = ({ zh: STATUS_SHORT_ZH, en: STATUS_SHORT_EN } as Record<string, Record<string, string>>)[locale] || STATUS_SHORT_EN;

      let summaryEnglish = '';
      let summaryChinese = '';
      if (childWorks && childWorks.size > 0) {
        const enLines: string[] = [];
        const zhLines: string[] = [];
        const childProgress = childProgressMap.get(child.id);

        // Section 1: Language works done this week
        const langWorks = childWorks.get('language');
        if (langWorks && langWorks.length > 0) {
          const enParts = langWorks.map(w => {
            const status = childProgress?.get(w.toLowerCase()) || 'presented';
            return `${w} (${STATUS_SHORT_EN[status] || status})`;
          });
          enLines.push(enParts.join('; '));

          const zhParts = langWorks.map(w => {
            const status = childProgress?.get(w.toLowerCase()) || 'presented';
            const zhName = getZhWorkName(w);
            return `${zhName} (${STATUS_SHORT_ZH[status] || status})`;
          });
          zhLines.push(zhParts.join('；'));
        }

        // Section 2: Short summary from teacher report key_insight
        const keyInsight = teacherKeyInsights.get(child.id);
        if (keyInsight) {
          enLines.push(keyInsight);
          zhLines.push(keyInsight); // key_insight is already in the locale it was generated in
        }

        // Section 3: Next week plan (Language only)
        const langFocus = childFocus?.get('language');
        if (langFocus) {
          enLines.push(`Next week: ${langFocus}`);
          zhLines.push(`下周: ${getZhWorkName(langFocus)}`);
        }

        summaryEnglish = enLines.length > 0 ? enLines.join('. ') : 'No recorded activities this week.';
        summaryChinese = zhLines.length > 0 ? zhLines.join('。') : '本周无记录活动。';
      } else {
        summaryEnglish = 'No recorded activities this week.';
        summaryChinese = '本周无记录活动。';
      }

      return {
        childId: child.id,
        childName: child.name,
        summaryEnglish,
        summaryChinese,
        planAreas,
        planAreasZh,
        // Pass through the raw data Haiku needs to write a narrative.
        // Keeps the per-child loop a synchronous data-build; the AI call is a
        // separate parallel pass below.
        _narrativeContext: {
          childWorks: childWorks ? Object.fromEntries(childWorks) : {},
          childProgress: childProgressMap.get(child.id) ? Object.fromEntries(childProgressMap.get(child.id)!) : {},
          focus: planAreas,
        },
      };
    });

    // ── Haiku narrative pass ─────────────────────────────────────
    // Replace each child's flat-tag summaryEnglish with a 2-3 sentence
    // narrative paragraph teachers can copy-paste straight into a parent
    // doc. Per-child Haiku call, all in parallel, ~600ms each.
    //
    // 🚨 NARRATIVE_AREAS — controls which curriculum areas appear in the
    // generated paragraph. Whale Class currently uses language-only
    // summaries (May 7, 2026 decision). Expand the array to include
    // ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']
    // when the school wants whole-child narratives. The works list passed
    // to Haiku is filtered to these areas BEFORE the prompt is built.
    const NARRATIVE_AREAS = ['language'] as const;

    // Flat-tag fallback ("Work (P); Work (Pr). Next week: X") is preserved
    // on the suggestion BEFORE the Haiku pass — if Haiku fails or AI is
    // disabled, the textarea still gets meaningful text.
    if (AI_ENABLED && anthropic) {
      const narrativePromises = suggestions.map(async (s) => {
        const ctx = s._narrativeContext;
        // No data → keep the flat fallback (which says "No recorded activities…")
        const totalWorks = Object.values(ctx.childWorks).reduce((acc: number, v: unknown) => acc + (Array.isArray(v) ? v.length : 0), 0);
        if (totalWorks === 0) return;

        // Build the structured prompt input — FILTERED to NARRATIVE_AREAS only.
        // Other areas' works are excluded entirely so Haiku can't bring them in.
        const worksByArea: string[] = [];
        for (const [area, names] of Object.entries(ctx.childWorks)) {
          if (!(NARRATIVE_AREAS as readonly string[]).includes(area)) continue;
          if (!Array.isArray(names) || names.length === 0) continue;
          const tagged = (names as string[]).map(n => {
            const status = ctx.childProgress[n.toLowerCase()] || 'presented';
            const tag = status === 'mastered' ? 'mastered' : status === 'practicing' ? 'practicing' : 'presented';
            return `${n} (${tag})`;
          });
          worksByArea.push(`${area.replace(/_/g, ' ')}: ${tagged.join(', ')}`);
        }
        // No language work this period → keep flat fallback (already says "no recorded activities" or similar).
        if (worksByArea.length === 0) return;

        const focusList = Object.entries(ctx.focus)
          .filter(([area, v]) => v && !String(v).endsWith('-P') && (NARRATIVE_AREAS as readonly string[]).includes(area))
          .map(([area, v]) => `${area.replace(/_/g, ' ')}: ${String(v).replace(/-P$/, '')}`)
          .join('; ');

        const areaLabel = NARRATIVE_AREAS.length === 1
          ? `${NARRATIVE_AREAS[0].replace(/_/g, ' ')} `
          : '';

        try {
          const res = await anthropic.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 280,
            messages: [{
              role: 'user',
              content: `Write a 2-3 sentence warm narrative paragraph about ${s.childName}'s ${areaLabel}work this week for the teacher's printable summary. Use ONLY the works listed below — do NOT mention any other curriculum area, materials, or activities not on this list. Keep it factual, observational, Montessori-aligned in tone — never invent details, never use "loves" or "enjoys" without evidence. Always phrase the time frame as "this week" regardless of how many weeks of data are listed below. End with one short sentence about what's next.

Works this week:
${worksByArea.join('\n')}

Next focus${focusList ? `: ${focusList}` : ' — none specified'}.

Output ONLY the paragraph. No preamble, no markdown, no quotes around it. Start with the child's name.`
            }],
          });
          const block = res.content?.[0];
          if (block && block.type === 'text' && block.text.trim()) {
            const narrative = block.text.trim();
            // Replace the flat-tag summaryEnglish on the suggestion in-place.
            s.summaryEnglish = narrative;
          }
        } catch (err) {
          console.error(`[auto-fill] Haiku narrative failed for ${s.childName}:`, err instanceof Error ? err.message : err);
          // Silently keep the flat-tag fallback already on s.summaryEnglish.
        }
      });
      // Cap at 25s so a slow Haiku response doesn't time the whole route out.
      await Promise.race([
        Promise.allSettled(narrativePromises),
        new Promise(resolve => setTimeout(resolve, 25_000)),
      ]);
    }

    // Strip the internal _narrativeContext before returning to the client.
    const cleanSuggestions = suggestions.map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _narrativeContext, ...rest } = s;
      return rest;
    });

    return NextResponse.json(
      { children: cleanSuggestions },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    );
  } catch (err) {
    console.error('auto-fill exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────

/** Get YYYY-MM-DD of the Monday of the week containing the given date (Beijing time). */
function getBeijingMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Get YYYY-MM-DD of the Monday after the given Monday string. */
function getNextMonday(mondayStr: string): string {
  const d = new Date(`${mondayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
