// app/api/montree/weekly-admin-docs/auto-fill/route.ts
// GET: Returns auto-generated suggestions for Weekly Summary + Plan
// from progress data + focus works. Teacher reviews and edits before saving.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
const AREA_LABELS: Record<string, { en: string; zh: string }> = {
  practical_life: { en: 'Practical Life', zh: '日常生活' },
  sensorial: { en: 'Sensorial', zh: '感官' },
  mathematics: { en: 'Mathematics', zh: '数学' },
  language: { en: 'Language', zh: '语言' },
  cultural: { en: 'Cultural', zh: '文化' },
};

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
    const [reportsRes, focusWorksRes, mediaRes, existingNotesRes, allWorksRes] = await Promise.all([
      // Weekly Wrap reports — parent (preferred, has works array) + teacher (fallback)
      supabase
        .from('montree_weekly_reports')
        .select('child_id, report_type, content')
        .eq('classroom_id', classroomId)
        .in('report_type', ['parent', 'teacher'])
        .eq('week_start', weekStart)
        .in('child_id', childIds),

      supabase
        .from('montree_child_focus_works')
        .select('child_id, area, work_name')
        .in('child_id', childIds),

      // Smart Capture photos with work_id this week
      supabase
        .from('montree_media')
        .select('id, child_id, work_id, captured_at')
        .eq('classroom_id', classroomId)
        .eq('media_type', 'photo')
        .not('work_id', 'is', null)
        .gte('captured_at', weekStart)
        .lt('captured_at', weekEndStr),

      // Existing saved notes (for flat-text parsing fallback)
      supabase
        .from('montree_weekly_admin_notes')
        .select('child_id, english_text, chinese_text')
        .eq('classroom_id', classroomId)
        .eq('week_start', weekStart)
        .eq('doc_type', 'summary')
        .is('area', null),

      // All curriculum works (name → area_key for parsing flat text)
      supabase
        .from('montree_classroom_curriculum_works')
        .select('name, area_key')
        .eq('classroom_id', classroomId),
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

    // Build work name → area lookup from curriculum (for flat-text parsing fallback)
    const workNameToArea = new Map<string, string>();
    for (const w of (allWorksRes.data || []) as Array<{ name: string; area_key: string }>) {
      workNameToArea.set(w.name.toLowerCase(), w.area_key);
      // Also store without " - suffix" variants
      const base = w.name.replace(/\s*-\s*.+$/, '').trim();
      if (base !== w.name) workNameToArea.set(base.toLowerCase(), w.area_key);
    }

    // Build existing saved notes by child (flat-text fallback source)
    const existingNotes = new Map<string, { en: string; zh: string }>();
    for (const note of (existingNotesRes.data || []) as Array<{ child_id: string; english_text: string | null; chinese_text: string | null }>) {
      existingNotes.set(note.child_id, {
        en: note.english_text || '',
        zh: note.chinese_text || '',
      });
    }

    // Parse flat-paragraph text into area → [work names]
    // Input: "did X, Y, Z (Variant), and W this week. Next week: A."
    // Output: Map<area, string[]>
    function parseFlatText(text: string): Map<string, string[]> {
      const result = new Map<string, string[]>();
      if (!text) return result;
      // Strip "did " prefix and " this week." / " Next week:..." suffix
      let body = text.replace(/^did\s+/i, '').replace(/\s+this\s+week\.?\s*(Next\s+week:.*)?\s*$/i, '');
      // Split by ", " and " and " to get individual work names
      const parts = body.split(/,\s+(?:and\s+)?|\s+and\s+/).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        // Try exact match, then base name (without " - suffix" or " (variant)")
        const lower = part.toLowerCase();
        let area = workNameToArea.get(lower);
        if (!area) {
          const base = part.replace(/\s*[\-(].*$/, '').trim().toLowerCase();
          area = workNameToArea.get(base);
        }
        if (!area) {
          // Fuzzy: try substring match against all known works
          for (const [name, aKey] of workNameToArea) {
            if (lower.includes(name) || name.includes(lower)) {
              area = aKey;
              break;
            }
          }
        }
        if (area) {
          if (!result.has(area)) result.set(area, []);
          const existing = result.get(area)!;
          if (!existing.includes(part)) existing.push(part);
        }
      }
      return result;
    }

    // Build Weekly Wrap works by child: childId -> area -> [work names]
    // Prefer parent reports (have works array), fall back to teacher reports (have area_analyses)
    interface ReportWork { name: string; area: string; status?: string }
    interface AreaAnalysis { area: string; works_count?: number; narrative?: string; works?: string[] }
    const wrapWorksByChild = new Map<string, Map<string, string[]>>();
    const allReports = (reportsRes.data || []) as Array<{
      child_id: string;
      report_type: string;
      content: { works?: ReportWork[]; area_analyses?: AreaAnalysis[] };
    }>;
    // Sort so parent reports are processed first (overwrite teacher data)
    const parentReports = allReports.filter(r => r.report_type === 'parent');
    const teacherReports = allReports.filter(r => r.report_type === 'teacher');
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
        .select('id, name, name_zh, area_key')
        .in('id', workIds);
      for (const w of (worksData || []) as Array<{ id: string; name: string; name_zh: string | null; area_key: string }>) {
        workIdToName.set(w.id, { name: w.name, name_zh: w.name_zh, area: w.area_key });
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

    // Build focus works lookup
    const focusMap = new Map<string, Map<string, string>>();
    for (const fw of (focusWorks || []) as FocusWorkRow[]) {
      if (!focusMap.has(fw.child_id)) focusMap.set(fw.child_id, new Map());
      focusMap.get(fw.child_id)!.set(fw.area, fw.work_name);
    }

    // Build suggestions for each child
    const suggestions: ChildSuggestion[] = children.map((child: { id: string; name: string }) => {
      const childFocus = focusMap.get(child.id);
      // Prefer Weekly Wrap data → photos → parsed flat text from existing saved notes
      let childWorks = wrapWorksByChild.get(child.id) || photoWorksByChild.get(child.id);
      if (!childWorks || childWorks.size === 0) {
        const saved = existingNotes.get(child.id);
        if (saved) {
          const parsed = parseFlatText(saved.en || saved.zh);
          if (parsed.size > 0) childWorks = parsed;
        }
      }

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

      // --- Summary (area-by-area, both languages) ---
      let summaryEnglish = '';
      let summaryChinese = '';
      if (childWorks && childWorks.size > 0) {
        const enLines: string[] = [];
        const zhLines: string[] = [];
        for (const area of AREAS) {
          const works = childWorks.get(area);
          if (works && works.length > 0) {
            enLines.push(`${AREA_LABELS[area].en}: ${works.join(', ')}`);
            const zhWorks = works.map(w => getZhWorkName(w));
            zhLines.push(`${AREA_LABELS[area].zh}：${zhWorks.join('、')}`);
          }
        }
        // Append "Next week" line if there are focus works
        if (nextWeekEn.length > 0) {
          enLines.push('');
          enLines.push(`Next week: ${nextWeekEn.join(', ')}`);
        }
        if (nextWeekZh.length > 0) {
          zhLines.push('');
          zhLines.push(`下周计划：${nextWeekZh.join('、')}`);
        }
        summaryEnglish = enLines.length > 0 ? enLines.join('\n') : 'No recorded activities this week.';
        summaryChinese = zhLines.length > 0 ? zhLines.join('\n') : '本周没有记录到活动。';
      } else {
        summaryEnglish = 'No recorded activities this week.';
        summaryChinese = '本周没有记录到活动。';
      }

      return {
        childId: child.id,
        childName: child.name,
        summaryEnglish,
        summaryChinese,
        planAreas,
        planAreasZh,
      };
    });

    return NextResponse.json(
      { children: suggestions },
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
