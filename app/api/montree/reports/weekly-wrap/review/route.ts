// /api/montree/reports/weekly-wrap/review/route.ts
// GET: Load all reports for a given week for the review page
// Query params: classroom_id, week_start

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { MONTESSORI_GLOSSARY_ZH } from '@/lib/montree/classifier/montessori-glossary-zh';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const url = new URL(request.url);
    const classroom_id = url.searchParams.get('classroom_id');
    const week_start = url.searchParams.get('week_start');

    if (!classroom_id || !week_start) {
      return NextResponse.json(
        { error: 'classroom_id and week_start are required' },
        { status: 400 }
      );
    }

    // Verify classroom belongs to this school (cross-pollination guard)
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Load area UUID → area_key mapping to resolve any UUID areas in stored reports
    const { data: areasRaw } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroom_id);
    const areaIdToKey = new Map<string, string>();
    for (const a of (areasRaw || []) as Array<{ id: string; area_key: string }>) {
      areaIdToKey.set(a.id, a.area_key);
    }

    // Also load work name → area_key + Chinese names + Chinese descriptions for localization
    const { data: worksRaw } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, name_zh, area_id, parent_description_zh, why_it_matters_zh')
      .eq('classroom_id', classroom_id);
    const workNameToArea = new Map<string, string>();
    const workNameToChinese = new Map<string, string>();
    const workNameToDescZh = new Map<string, string>();
    const workNameToWhyZh = new Map<string, string>();
    for (const w of (worksRaw || []) as Array<{ name: string; name_zh: string | null; area_id: string | null; parent_description_zh: string | null; why_it_matters_zh: string | null }>) {
      if (w.area_id) {
        workNameToArea.set(w.name.toLowerCase().trim(), areaIdToKey.get(w.area_id) || w.area_id);
      }
      if (w.name_zh) {
        workNameToChinese.set(w.name.toLowerCase().trim(), w.name_zh);
      }
      if (w.parent_description_zh) {
        workNameToDescZh.set(w.name.toLowerCase().trim(), w.parent_description_zh);
      }
      if (w.why_it_matters_zh) {
        workNameToWhyZh.set(w.name.toLowerCase().trim(), w.why_it_matters_zh);
      }
    }

    // Helper: resolve an area string (might be UUID, canonical key, or label) to canonical key
    const CANONICAL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const resolveArea = (raw: string, workName?: string): string => {
      if (!raw && workName) return workNameToArea.get(workName.toLowerCase().trim()) || '';
      if (!raw) return '';
      if (typeof raw !== 'string') raw = String(raw);
      // Already canonical?
      if (CANONICAL_AREAS.includes(raw)) return raw;
      // UUID → look up in area map
      if (areaIdToKey.has(raw)) return areaIdToKey.get(raw)!;
      // UUID pattern but not in our map — try work name fallback
      if (/^[0-9a-f]{8}-/.test(raw) && workName) {
        return workNameToArea.get(workName.toLowerCase().trim()) || '';
      }
      // Fuzzy keyword match
      const lower = raw.toLowerCase().replace(/[^a-z]/g, '');
      if (lower.includes('practical') || lower.includes('life')) return 'practical_life';
      if (lower.includes('sensor')) return 'sensorial';
      if (lower.includes('math') || lower.includes('number')) return 'mathematics';
      if (lower.includes('lang') || lower.includes('reading') || lower.includes('writing')) return 'language';
      if (lower.includes('cultur') || lower.includes('science') || lower.includes('geography')) return 'cultural';
      // Last resort: work name lookup
      if (workName) return workNameToArea.get(workName.toLowerCase().trim()) || raw;
      return raw;
    };

    // Extract the actual work name from an AI recommendation sentence
    // e.g. "Present Carrying a Mat as the foundational Practical Life work" → "Carrying a Mat"
    // e.g. "Continue Sand Tray Writing with increased frequency and observation" → "Sand Tray Writing"
    const cleanWorkName = (raw: string): string => {
      if (!raw) return raw || '';
      if (typeof raw !== 'string') return String(raw);
      let name = raw.trim();
      // Strip leading action verbs
      name = name.replace(/^(Present|Continue|Introduce|Begin|Start|Explore|Practice|Review|Offer|Revisit|Try|Focus on|Work on|Encourage)\s+/i, '');
      // Strip trailing clauses: "as the...", "with increased...", "because...", "for...", "to build...", "— ", " - "
      name = name.replace(/\s+(as the|as a|as an|with increased|with more|with special|because|for the|for a|to build|to develop|to strengthen|to support|to encourage|to practice|which will|that will|in order|progressively|sequentially)\b.*/i, '');
      name = name.replace(/\s+[—–-]\s+.*$/, '');
      // If name matches a known curriculum work, use that
      const key = name.toLowerCase().trim();
      if (workNameToArea.has(key)) return name;
      // Try to find the closest match by checking if a known work name is a substring
      for (const [knownName] of workNameToArea) {
        if (key.includes(knownName) && knownName.length > 3) {
          // Return properly cased version from our records
          const entry = (worksRaw || []).find((w: { name: string }) => w.name.toLowerCase().trim() === knownName);
          if (entry) return (entry as { name: string }).name;
        }
      }
      return name.trim();
    };

    // Get Chinese work name for a given English work name (with fuzzy fallback + glossary)
    const getChineseWorkName = (englishName: string): string | null => {
      if (!englishName || typeof englishName !== 'string') return null;
      const key = englishName.toLowerCase().trim();
      // 1. Exact match from DB name_zh
      const exact = workNameToChinese.get(key);
      if (exact) return exact;
      // 2. Strip " - suffix" variants (e.g. "Chalk Board Writing - No lines" → "chalk board writing")
      const base = key.replace(/\s*-\s*.+$/, '').trim();
      if (base !== key) {
        const baseMatch = workNameToChinese.get(base);
        if (baseMatch) return baseMatch;
      }
      // 3. Normalize spaces (e.g. "chalk board" → "chalkboard")
      const collapsed = base.replace(/\s+/g, '');
      for (const [k, v] of workNameToChinese) {
        if (k.replace(/\s+/g, '') === collapsed) return v;
      }
      // 4. Fallback to static Montessori glossary — exact match first
      const glossaryExact = MONTESSORI_GLOSSARY_ZH[englishName.trim()];
      if (glossaryExact) return glossaryExact;
      // 5. Glossary fuzzy: try base name (stripped suffix), title-cased
      const baseTitle = base.replace(/\b\w/g, c => c.toUpperCase());
      if (baseTitle !== englishName.trim()) {
        const glossaryBase = MONTESSORI_GLOSSARY_ZH[baseTitle];
        if (glossaryBase) return glossaryBase;
      }
      // 6. Glossary substring: check if any glossary key is contained in (or contains) the work name
      const nameLower = englishName.toLowerCase().trim();
      let bestGlossaryMatch: string | null = null;
      let bestGlossaryLen = 0;
      for (const [gKey, gVal] of Object.entries(MONTESSORI_GLOSSARY_ZH)) {
        const gLower = gKey.toLowerCase();
        if (nameLower.includes(gLower) && gLower.length > bestGlossaryLen && gLower.length >= 4) {
          bestGlossaryMatch = gVal;
          bestGlossaryLen = gLower.length;
        }
      }
      if (bestGlossaryMatch) return bestGlossaryMatch;
      return null;
    };

    // Fuzzy lookup helper for any work-name-keyed map (reuses same normalization as getChineseWorkName)
    const fuzzyLookup = (map: Map<string, string>, englishName: string): string | null => {
      if (!englishName || typeof englishName !== 'string') return null;
      const key = englishName.toLowerCase().trim();
      const exact = map.get(key);
      if (exact) return exact;
      const base = key.replace(/\s*-\s*.+$/, '').trim();
      if (base !== key) { const m = map.get(base); if (m) return m; }
      const collapsed = base.replace(/\s+/g, '');
      for (const [k, v] of map) { if (k.replace(/\s+/g, '') === collapsed) return v; }
      return null;
    };

    // Strip UUIDs from text (coerce to string — JSONB values may be numbers/objects)
    const cleanUUIDs = (text: string): string => {
      if (!text) return text || '';
      if (typeof text !== 'string') return String(text);
      return text
        .replace(/\s+in\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*\./g, '.')
        .trim();
    };

    // Get all reports for this week (both teacher and parent)
    const { data: reportsRaw } = await supabase
      .from('montree_weekly_reports')
      .select('id, child_id, report_type, status, content')
      .eq('classroom_id', classroom_id)
      .eq('week_start', week_start)
      .in('report_type', ['teacher', 'parent']);

    const reports = (reportsRaw || []) as Array<{
      id: string; child_id: string; report_type: string;
      status: string; content: Record<string, unknown>;
    }>;

    // Get children info
    const childIds = [...new Set(reports.map(r => r.child_id))];
    if (childIds.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    const { data: childrenRaw } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);

    const children = (childrenRaw || []) as Array<{ id: string; name: string }>;
    const childMap = new Map(children.map(c => [c.id, c.name]));

    // ── Load actual focus works from the single source of truth ──
    // montree_child_focus_works is the canonical shelf — written by replan,
    // fill-shelf button, and teacher wheel picker. All views must read from here.
    const { data: focusWorksRaw } = await supabase
      .from('montree_child_focus_works')
      .select('child_id, area, work_name, set_by, updated_at')
      .in('child_id', childIds);

    // Also load progress status for each focus work
    const { data: progressRaw } = await supabase
      .from('montree_child_work_progress')
      .select('child_id, work_name, status')
      .in('child_id', childIds);

    const progressMap = new Map<string, string>();
    for (const p of (progressRaw || []) as Array<{ child_id: string; work_name: string; status: string }>) {
      progressMap.set(`${p.child_id}::${p.work_name.toLowerCase()}`, p.status);
    }

    const focusWorksByChild = new Map<string, Array<{ area: string; work_name: string; work_name_zh: string | null; status: string }>>();
    for (const fw of (focusWorksRaw || []) as Array<{ child_id: string; area: string; work_name: string }>) {
      if (!focusWorksByChild.has(fw.child_id)) focusWorksByChild.set(fw.child_id, []);
      const status = progressMap.get(`${fw.child_id}::${fw.work_name.toLowerCase()}`) || 'presented';
      focusWorksByChild.get(fw.child_id)!.push({
        area: fw.area,
        work_name: fw.work_name,
        work_name_zh: getChineseWorkName(fw.work_name),
        status,
      });
    }

    // Group by child
    const byChild = new Map<string, {
      teacher_report: Record<string, unknown> | null;
      teacher_report_id: string | null;
      teacher_status: string | null;
      parent_content: Record<string, unknown> | null;
      parent_report_id: string | null;
      parent_status: string | null;
    }>();

    for (const r of reports) {
      if (!byChild.has(r.child_id)) {
        byChild.set(r.child_id, {
          teacher_report: null, teacher_report_id: null, teacher_status: null,
          parent_content: null, parent_report_id: null, parent_status: null,
        });
      }
      const entry = byChild.get(r.child_id)!;
      if (r.report_type === 'teacher') {
        entry.teacher_report = r.content;
        entry.teacher_report_id = r.id;
        entry.teacher_status = r.status;
      }
      if (r.report_type === 'parent') {
        entry.parent_content = r.content;
        entry.parent_report_id = r.id;
        entry.parent_status = r.status;
      }
    }

    // Safe array extraction — DB JSONB fields may be objects, strings, or null instead of arrays
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asArray = <T>(val: unknown): T[] => Array.isArray(val) ? val as T[] : [];

    const AREA_LABELS_EN: Record<string, string> = {
      practical_life: 'Practical Life', sensorial: 'Sensorial',
      mathematics: 'Mathematics', language: 'Language', cultural: 'Cultural',
    };
    const AREA_LABELS_ZH: Record<string, string> = {
      practical_life: '日常生活', sensorial: '感官',
      mathematics: '数学', language: '语言', cultural: '文化',
    };

    // Build results with full data for both tabs
    const results = Array.from(byChild.entries()).map(([childId, data]) => {
      const parentNarrative = (data.parent_content?.narrative as { summary?: string })?.summary || null;
      const parentPhotosRaw = asArray<{
        id: string; url: string; work_name?: string; caption?: string; captured_at?: string;
      }>(data.parent_content?.photos);
      // Add Chinese work name to each photo
      const parentPhotos = parentPhotosRaw.map(p => ({
        ...p,
        work_name_zh: p.work_name ? getChineseWorkName(p.work_name) : null,
      }));
      const parentWorks = asArray<{
        name: string; area: string; status: string;
        parent_description?: string; why_it_matters?: string;
        photo_url?: string; photo_caption?: string;
      }>(data.parent_content?.works);
      const photoCount = parentPhotos.length;

      const teacherFlagsRaw = asArray<{ level: string; issue: string; recommendation: string }>(data.teacher_report?.flags);
      // Clean UUIDs from flag text
      const teacherFlags = teacherFlagsRaw.map(f => ({
        ...f,
        issue: cleanUUIDs(f.issue),
        recommendation: cleanUUIDs(f.recommendation),
      }));
      const flagsCount = teacherFlags.length;
      const keyInsight = cleanUUIDs((data.teacher_report?.key_insight as string) || '');
      const teacherGuidance = cleanUUIDs((data.teacher_report?.teacher_guidance as string) || '');
      // Resolve recommendation areas from UUID to canonical key
      const recommendationsRaw = asArray<{
        area: string; area_label: string; work: string; reasoning: string;
      }>(data.teacher_report?.recommendations);
      const recommendations = recommendationsRaw.map(rec => {
        const cleanedWork = cleanWorkName(rec.work);
        const resolved = resolveArea(rec.area, cleanedWork);
        return {
          ...rec,
          area: resolved,
          area_label: AREA_LABELS_EN[resolved] || rec.area_label || resolved.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          area_label_zh: AREA_LABELS_ZH[resolved] || '',
          work: cleanedWork,
          work_zh: getChineseWorkName(cleanedWork),
          reasoning: cleanUUIDs(rec.reasoning),
        };
      });
      const areaAnalysesRaw = asArray<{
        area: string; area_label: string; works_count: number; narrative: string;
      }>(data.teacher_report?.area_analyses);
      const areaAnalyses = areaAnalysesRaw.map(a => {
        const resolved = resolveArea(a.area);
        return {
          ...a,
          area: resolved,
          area_label: AREA_LABELS_EN[resolved] || a.area_label || resolved.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          area_label_zh: AREA_LABELS_ZH[resolved] || '',
          narrative: cleanUUIDs(a.narrative),
        };
      });

      // Resolve parent work areas + add Chinese names + Chinese descriptions
      const resolvedParentWorks = parentWorks.map(w => ({
        ...w,
        area: resolveArea(w.area, w.name),
        name_zh: getChineseWorkName(w.name),
        parent_description_zh: fuzzyLookup(workNameToDescZh, w.name),
        why_it_matters_zh: fuzzyLookup(workNameToWhyZh, w.name),
      }));

      return {
        child_id: childId,
        child_name: childMap.get(childId) || 'Unknown',
        // Teacher data (cleaned/extracted fields only — raw teacher_report omitted to halve payload)
        teacher_report_id: data.teacher_report_id,
        teacher_status: data.teacher_status,
        key_insight: keyInsight || null,
        teacher_guidance: teacherGuidance || null,
        recommendations,
        area_analyses: areaAnalyses,
        flags: teacherFlags,
        flags_count: flagsCount,
        // Canonical focus works from montree_child_focus_works — single source of truth
        focus_works: focusWorksByChild.get(childId) || [],
        // Parent data
        parent_narrative: parentNarrative,
        parent_photos: parentPhotos,
        parent_works: resolvedParentWorks,
        photo_count: photoCount,
        report_id: data.parent_report_id,
        parent_status: data.parent_status,
      };
    });

    return NextResponse.json({ reports: results });
  } catch (error) {
    console.error('Weekly wrap review error:', error instanceof Error ? { message: error.message, stack: error.stack?.split('\n').slice(0, 5).join('\n') } : error);
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
