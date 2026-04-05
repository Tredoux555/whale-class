// /api/montree/reports/weekly-wrap/review/route.ts
// GET: Load all reports for a given week for the review page
// Query params: classroom_id, week_start

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

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

    // Also load work name → area_key for fallback resolution
    const { data: worksRaw } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, area_id')
      .eq('classroom_id', classroom_id);
    const workNameToArea = new Map<string, string>();
    for (const w of (worksRaw || []) as Array<{ name: string; area_id: string | null }>) {
      if (w.area_id) {
        workNameToArea.set(w.name.toLowerCase().trim(), areaIdToKey.get(w.area_id) || w.area_id);
      }
    }

    // Helper: resolve an area string (might be UUID, canonical key, or label) to canonical key
    const CANONICAL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const resolveArea = (raw: string, workName?: string): string => {
      if (!raw && workName) return workNameToArea.get(workName.toLowerCase().trim()) || '';
      if (!raw) return '';
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

    // Strip UUIDs from text
    const cleanUUIDs = (text: string): string => {
      if (!text) return text;
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

    // Build results with full data for both tabs
    const results = Array.from(byChild.entries()).map(([childId, data]) => {
      const parentNarrative = (data.parent_content?.narrative as { summary?: string })?.summary || null;
      const parentPhotos = (data.parent_content?.photos as Array<{
        id: string; url: string; work_name?: string; caption?: string; captured_at?: string;
      }>) || [];
      const parentWorks = (data.parent_content?.works as Array<{
        name: string; area: string; status: string;
        parent_description?: string; why_it_matters?: string;
        photo_url?: string; photo_caption?: string;
      }>) || [];
      const photoCount = parentPhotos.length;

      const teacherFlagsRaw = (data.teacher_report?.flags as Array<{ level: string; issue: string; recommendation: string }>) || [];
      // Clean UUIDs from flag text
      const teacherFlags = teacherFlagsRaw.map(f => ({
        ...f,
        issue: cleanUUIDs(f.issue),
        recommendation: cleanUUIDs(f.recommendation),
      }));
      const flagsCount = teacherFlags.length;
      const keyInsight = cleanUUIDs((data.teacher_report?.key_insight as string) || '');
      // Resolve recommendation areas from UUID to canonical key
      const recommendationsRaw = (data.teacher_report?.recommendations as Array<{
        area: string; area_label: string; work: string; reasoning: string;
      }>) || [];
      const recommendations = recommendationsRaw.map(rec => {
        const resolved = resolveArea(rec.area, rec.work);
        const AREA_LABELS: Record<string, string> = {
          practical_life: 'Practical Life', sensorial: 'Sensorial',
          mathematics: 'Mathematics', language: 'Language', cultural: 'Cultural',
        };
        return {
          ...rec,
          area: resolved,
          area_label: AREA_LABELS[resolved] || rec.area_label || resolved.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
          reasoning: cleanUUIDs(rec.reasoning),
        };
      });
      const areaAnalysesRaw = (data.teacher_report?.area_analyses as Array<{
        area: string; area_label: string; works_count: number; narrative: string;
      }>) || [];
      const areaAnalyses = areaAnalysesRaw.map(a => ({
        ...a,
        area: resolveArea(a.area),
        narrative: cleanUUIDs(a.narrative),
      }));

      // Resolve parent work areas too
      const resolvedParentWorks = parentWorks.map(w => ({
        ...w,
        area: resolveArea(w.area, w.name),
      }));

      return {
        child_id: childId,
        child_name: childMap.get(childId) || 'Unknown',
        // Teacher data
        teacher_report: data.teacher_report,
        teacher_report_id: data.teacher_report_id,
        teacher_status: data.teacher_status,
        key_insight: keyInsight || null,
        recommendations,
        area_analyses: areaAnalyses,
        flags: teacherFlags,
        flags_count: flagsCount,
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
    console.error('Weekly wrap review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
