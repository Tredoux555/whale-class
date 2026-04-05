// /api/montree/reports/weekly-wrap/route.ts
// POST: Generate both teacher + parent reports for all children in a classroom
// This is the "Weekly Wrap" endpoint — one click, two report types, full classroom
//
// Body: {
//   classroom_id: string,
//   week_start: string,     // YYYY-MM-DD
//   week_end: string,       // YYYY-MM-DD
//   child_ids?: string[],   // optional subset
//   locale?: 'en' | 'zh',
//   force_regenerate?: boolean
// }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { analyzeWeeklyProgress } from '@/lib/montree/ai';
import { generateWeeklyNarrative, NarrativeInput } from '@/lib/montree/reports/narrative-generator';
import { generateTeacherReport, TeacherReportInput } from '@/lib/montree/reports/teacher-report-generator';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getChineseDescriptionsMap } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

const MAX_CONCURRENT = 5;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const {
      classroom_id,
      week_start,
      week_end,
      child_ids: requestedChildIds,
      locale: requestLocale,
      force_regenerate = false,
      stream: useStreaming = false,
    } = body;

    if (!classroom_id || !week_start || !week_end) {
      return NextResponse.json(
        { error: 'classroom_id, week_start, and week_end are required' },
        { status: 400 }
      );
    }

    if (isNaN(Date.parse(week_start)) || isNaN(Date.parse(week_end)) || week_start > week_end) {
      return NextResponse.json(
        { error: 'Invalid week_start or week_end dates' },
        { status: 400 }
      );
    }

    const locale = (['en', 'zh'].includes(requestLocale) ? requestLocale : getLocaleFromRequest(request.url)) as 'en' | 'zh';

    // Verify classroom belongs to school
    const { data: classroomRaw } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id')
      .eq('id', classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomRaw) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }
    const classroom = classroomRaw as { id: string; name: string; school_id: string };

    // Get children
    let childQuery = supabase
      .from('montree_children')
      .select('id, name, date_of_birth, classroom_id, enrolled_at')
      .eq('classroom_id', classroom_id)
      .eq('is_active', true);

    if (requestedChildIds && requestedChildIds.length > 0) {
      childQuery = childQuery.in('id', requestedChildIds);
    }

    const { data: childrenRaw, error: childrenError } = await childQuery;
    if (childrenError) {
      console.error('weekly-wrap: children query error:', childrenError.message);
      return NextResponse.json({ error: `Failed to fetch children: ${childrenError.message}` }, { status: 500 });
    }
    const children = (childrenRaw || []) as Array<{
      id: string; name: string; date_of_birth: string; classroom_id: string; enrolled_at: string | null;
    }>;
    if (children.length === 0) {
      return NextResponse.json({ error: 'No active children found in this classroom' }, { status: 404 });
    }

    // Load shared data (curriculum works + visual memory + descriptions + area mapping)
    const [curriculumRes, visualRes, areasRes] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh, name_zh, area_id')
        .eq('classroom_id', classroom_id),
      supabase
        .from('montree_visual_memory')
        .select('work_name, parent_description, why_it_matters')
        .eq('classroom_id', classroom_id)
        .not('parent_description', 'is', null),
      supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroom_id),
    ]);

    const curriculumWorks = (curriculumRes.data || []) as Array<{
      id: string; name: string; parent_description: string | null; why_it_matters: string | null;
      parent_description_zh: string | null; why_it_matters_zh: string | null; name_zh: string | null; area_id: string | null;
    }>;
    const visualMemories = (visualRes.data || []) as Array<{
      work_name: string; parent_description: string | null; why_it_matters: string | null;
    }>;

    // Build area UUID → canonical area_key map (e.g. "8ed822b1-..." → "mathematics")
    const areaIdToKey = new Map<string, string>();
    for (const a of (areasRes.data || []) as Array<{ id: string; area_key: string }>) {
      areaIdToKey.set(a.id, a.area_key);
    }

    // Build description + area lookups
    const workIdToName = new Map<string, string>();
    const workNameToArea = new Map<string, string>(); // name (lowercase) → area_key (canonical)
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    for (const w of curriculumWorks) {
      workIdToName.set(w.id, w.name);
      if (w.area_id) {
        // Resolve UUID to canonical area key (e.g. "mathematics", "language")
        const areaKey = areaIdToKey.get(w.area_id) || w.area_id;
        workNameToArea.set(w.name.toLowerCase().trim(), areaKey);
      }
      const desc = (locale === 'zh' && w.parent_description_zh) ? w.parent_description_zh : w.parent_description;
      const whyMatters = (locale === 'zh' && w.why_it_matters_zh) ? w.why_it_matters_zh : (w.why_it_matters || '');
      if (desc) {
        dbDescriptions.set(w.name.toLowerCase().trim(), { description: desc, why_it_matters: whyMatters });
      }
    }
    if (locale === 'zh') {
      const zhDescriptions = getChineseDescriptionsMap();
      for (const [name, zh] of zhDescriptions) {
        dbDescriptions.set(name, { description: zh.parent_description, why_it_matters: zh.why_it_matters });
      }
    }
    if (visualMemories) {
      for (const vm of visualMemories) {
        if (vm.work_name && vm.parent_description) {
          dbDescriptions.set(vm.work_name.toLowerCase().trim(), {
            description: vm.parent_description,
            why_it_matters: vm.why_it_matters || '',
          });
        }
      }
    }

    // Week number calculation
    const weekStartDate = new Date(week_start);
    const reportYear = weekStartDate.getFullYear();
    const startOfYear = new Date(reportYear, 0, 1);
    const daysSinceStart = Math.floor((weekStartDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

    // Check existing reports (skip if not force)
    const existingTeacherReports = new Map<string, boolean>();
    const existingParentReports = new Map<string, boolean>();
    if (!force_regenerate) {
      const { data: existingData } = await supabase
        .from('montree_weekly_reports')
        .select('child_id, report_type, content')
        .in('child_id', children.map(c => c.id))
        .eq('week_start', week_start)
        .in('report_type', ['teacher', 'parent']);

      for (const r of (existingData || []) as Array<{ child_id: string; report_type: string; content: Record<string, unknown> }>) {
        if (r.report_type === 'teacher' && r.content) existingTeacherReports.set(r.child_id, true);
        if (r.report_type === 'parent' && r.content?.narrative) existingParentReports.set(r.child_id, true);
      }
    }

    // ─── Helper: process a single child ───
    async function processChild(child: typeof children[0]) {
          try {
            // Skip if both reports already exist
            if (existingTeacherReports.has(child.id) && existingParentReports.has(child.id)) {
              return {
                child_id: child.id,
                child_name: child.name,
                success: true,
                skipped: true,
                photo_count: 0,
              };
            }

            // Fetch progress + photos for the week
            const fourWeeksAgo = new Date(week_start);
            fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

            const [progressRes, historicalRes, photosRes, groupPhotosRes] = await Promise.all([
              supabase
                .from('montree_child_progress')
                .select('work_name, area, status, notes, created_at')
                .eq('child_id', child.id)
                .gte('created_at', week_start)
                .lte('created_at', week_end + 'T23:59:59'),
              supabase
                .from('montree_child_progress')
                .select('work_name, area, status, created_at')
                .eq('child_id', child.id)
                .gte('created_at', fourWeeksAgo.toISOString())
                .lt('created_at', week_start),
              supabase
                .from('montree_media')
                .select('id, storage_path, work_id, caption, captured_at')
                .eq('child_id', child.id)
                .neq('parent_visible', false)
                .gte('captured_at', week_start)
                .lte('captured_at', week_end + 'T23:59:59'),
              supabase
                .from('montree_media_children')
                .select(`media:montree_media (id, storage_path, work_id, caption, captured_at)`)
                .eq('child_id', child.id),
            ]);

            type ProgressRecord = { work_name: string; area: string; status: string; notes?: string; created_at: string };
            type HistoryRecord = { work_name: string; area: string; status: string; created_at: string };
            type PhotoRecord = { id: string; storage_path: string; work_id: string | null; caption: string | null; captured_at: string };

            const progress = (progressRes.data || []) as ProgressRecord[];
            const historical = (historicalRes.data || []) as HistoryRecord[];

            // Combine direct + group photos, deduplicate
            const photoMap = new Map<string, PhotoRecord>();
            for (const p of (photosRes.data || []) as PhotoRecord[]) {
              photoMap.set(p.id, p);
            }
            for (const gp of (groupPhotosRes.data || []) as Array<{ media: PhotoRecord | null }>) {
              if (gp.media) {
                const capturedDate = gp.media.captured_at?.split('T')[0] || '';
                if (capturedDate >= week_start && capturedDate <= week_end) {
                  photoMap.set(gp.media.id, gp.media);
                }
              }
            }
            const photos = Array.from(photoMap.values());

            // Build enriched photo data
            const enrichedPhotos: Array<{
              work_name: string;
              area: string;
              status: string;
              parent_description: string | null;
              why_it_matters: string | null;
              caption: string | null;
            }> = [];

            const photoByWorkName = new Map<string, PhotoRecord>();
            for (const photo of photos) {
              const workName = photo.work_id ? workIdToName.get(photo.work_id) : photo.caption;
              if (!workName) continue;
              photoByWorkName.set(workName.toLowerCase(), photo);

              const desc = dbDescriptions.get(workName.toLowerCase().trim());
              const matchingProgress = progress.find(
                p => p.work_name.toLowerCase() === workName.toLowerCase()
              );

              enrichedPhotos.push({
                work_name: workName,
                area: matchingProgress?.area || workNameToArea.get(workName.toLowerCase().trim()) || '',
                status: matchingProgress?.status || 'documented',
                parent_description: desc?.description || null,
                why_it_matters: desc?.why_it_matters || null,
                caption: photo.caption,
              });
            }

            // Calculate child age
            const childAge = child.date_of_birth
              ? (Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
              : 4;

            // Run weekly analysis
            const analysis = analyzeWeeklyProgress({
              child: {
                id: child.id,
                name: child.name,
                date_of_birth: child.date_of_birth,
                classroom_id: child.classroom_id,
              },
              weekStart: week_start,
              weekEnd: week_end,
              progress: progress.map(p => ({
                work_name: p.work_name,
                area: p.area || workNameToArea.get(p.work_name.toLowerCase().trim()) || '',
                status: p.status,
                notes: p.notes,
                date: p.created_at,
              })),
              historicalProgress: historical.map(p => ({
                work_name: p.work_name,
                area: p.area,
                status: p.status,
                date: p.created_at,
              })),
              availableWorks: curriculumWorks.map(w => ({
                id: w.id,
                name: w.name,
                area: (w.area_id ? areaIdToKey.get(w.area_id) : '') || '',
              })),
            });

            let totalTokens = { input: 0, output: 0 };
            const now = new Date().toISOString();

            // ─── Generate Teacher Report ───
            let teacherReportContent: Record<string, unknown> | null = null;
            if (!existingTeacherReports.has(child.id)) {
              const teacherResult = await generateTeacherReport({
                child: {
                  name: child.name,
                  age: Math.round(childAge * 10) / 10,
                  date_of_birth: child.date_of_birth,
                  enrollment_date: child.enrolled_at,
                  classroom_name: classroom.name,
                },
                weekStart: week_start,
                weekEnd: week_end,
                locale,
                analysis,
                photos: enrichedPhotos,
              });

              if (teacherResult.tokensUsed) {
                totalTokens.input += teacherResult.tokensUsed.input;
                totalTokens.output += teacherResult.tokensUsed.output;
              }

              teacherReportContent = {
                ...teacherResult.report,
                generated_at: teacherResult.generatedAt,
                model: teacherResult.model || 'template',
                tokens_used: teacherResult.tokensUsed,
              };

              // Upsert teacher report
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: teacherUpsertErr } = await (supabase.from('montree_weekly_reports') as any).upsert({
                school_id: classroom.school_id,
                classroom_id: classroom_id,
                child_id: child.id,
                week_start: week_start,
                week_end: week_end,
                week_number: weekNumber,
                report_year: reportYear,
                report_type: 'teacher',
                status: 'draft',
                content: teacherReportContent,
                generated_at: now,
              }, { onConflict: 'child_id,week_start,report_type' });
              if (teacherUpsertErr) {
                console.error(`Teacher report upsert failed for ${child.name}:`, teacherUpsertErr.message);
              }
            }

            // ─── Generate Parent Report ───
            let parentNarrative = '';
            if (!existingParentReports.has(child.id)) {
              const narrativeResult = await generateWeeklyNarrative({
                child: {
                  name: child.name,
                  age: Math.round(childAge * 10) / 10,
                  classroom_name: classroom.name,
                },
                weekStart: week_start,
                weekEnd: week_end,
                locale,
                analysis,
                photos: enrichedPhotos.map(p => ({
                  work_name: p.work_name,
                  area: p.area,
                  status: p.status,
                  parent_description: p.parent_description,
                  why_it_matters: p.why_it_matters,
                  caption: p.caption,
                })),
              });

              parentNarrative = narrativeResult.narrative;
              if (narrativeResult.tokensUsed) {
                totalTokens.input += narrativeResult.tokensUsed.input;
                totalTokens.output += narrativeResult.tokensUsed.output;
              }

              // Build parent report content
              const allWorks = enrichedPhotos.map(p => ({
                name: p.work_name,
                chineseName: locale === 'zh' ? getChineseNameForWork(p.work_name) : null,
                area: p.area,
                status: p.status,
                parent_description: p.parent_description,
                why_it_matters: p.why_it_matters,
                photo_url: (() => {
                  const matchPhoto = photoByWorkName.get(p.work_name.toLowerCase());
                  return matchPhoto ? getProxyUrl(matchPhoto.storage_path) : null;
                })(),
                photo_caption: p.caption,
              }));

              const parentReportContent = {
                child: { name: child.name, photo_url: null },
                narrative: {
                  summary: narrativeResult.narrative,
                  generated_at: narrativeResult.generatedAt,
                  model: narrativeResult.model || 'template',
                  tokens_used: narrativeResult.tokensUsed,
                },
                works: allWorks,
                photos: photos.map(p => ({
                  id: p.id,
                  url: getProxyUrl(p.storage_path),
                  work_name: p.work_id ? workIdToName.get(p.work_id) : p.caption,
                  caption: p.caption,
                  captured_at: p.captured_at,
                })),
                generated_at: now,
                report_locale: locale,
              };

              // Upsert parent report
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: parentUpsertErr } = await (supabase.from('montree_weekly_reports') as any).upsert({
                school_id: classroom.school_id,
                classroom_id: classroom_id,
                child_id: child.id,
                week_start: week_start,
                week_end: week_end,
                week_number: weekNumber,
                report_year: reportYear,
                report_type: 'parent',
                status: 'draft',
                content: parentReportContent,
                generated_at: now,
              }, { onConflict: 'child_id,week_start,report_type' });
              if (parentUpsertErr) {
                console.error(`Parent report upsert failed for ${child.name}:`, parentUpsertErr.message);
              }
            }

            const keyInsight = (teacherReportContent as any)?.key_insight || '';
            const flagsCount = (analysis.red_flags.length + analysis.yellow_flags.length);

            return {
              child_id: child.id,
              child_name: child.name,
              success: true,
              photo_count: enrichedPhotos.length,
              teacher_report_preview: keyInsight,
              parent_narrative: parentNarrative,
              flags_count: flagsCount,
              tokens_used: totalTokens.input > 0 ? totalTokens : undefined,
            };
          } catch (err) {
            console.error(`Weekly wrap error for ${child.name}:`, err);
            return {
              child_id: child.id,
              child_name: child.name,
              success: false,
              photo_count: 0,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          }
    } // end processChild

    // Helper: build final summary from results
    function buildSummary(results: Array<{ success: boolean; skipped?: boolean; tokens_used?: { input: number; output: number } }>) {
      const totalInputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.input || 0), 0);
      const totalOutputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.output || 0), 0);
      const estimatedCost = (totalInputTokens * 3 + totalOutputTokens * 15) / 1_000_000;
      return {
        success: true,
        generated: results.filter(r => r.success && !r.skipped).length,
        skipped: results.filter(r => r.skipped).length,
        failed: results.filter(r => !r.success).length,
        total: results.length,
        cost_usd: Math.round(estimatedCost * 1000) / 1000,
        week_number: weekNumber,
        report_year: reportYear,
      };
    }

    // ─── Streaming mode: NDJSON events per child ───
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send start event
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'start', total: children.length,
            }) + '\n'));

            const results: Array<{ success: boolean; skipped?: boolean; tokens_used?: { input: number; output: number } }> = [];
            let childIndex = 0;

            for (let i = 0; i < children.length; i += MAX_CONCURRENT) {
              const batch = children.slice(i, i + MAX_CONCURRENT);

              // Send child_start events for this batch
              for (const child of batch) {
                childIndex++;
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'child_start',
                  child_name: child.name,
                  index: childIndex,
                  total: children.length,
                }) + '\n'));
              }

              const batchResults = await Promise.all(batch.map(processChild));
              results.push(...batchResults);

              // Send child_done for each completed child
              for (const r of batchResults) {
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'child_done',
                  child_name: (r as any).child_name,
                  success: r.success,
                  skipped: r.skipped || false,
                }) + '\n'));
              }
            }

            // Send complete event
            const summary = buildSummary(results);
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'complete', ...summary, results,
            }) + '\n'));
            controller.close();
          } catch (err) {
            console.error('Weekly wrap stream error:', err);
            try {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'error',
                error: err instanceof Error ? err.message : 'Internal server error',
              }) + '\n'));
            } catch { /* controller may be closed */ }
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // ─── Non-streaming mode: classic JSON response ───
    const results: Array<any> = [];
    for (let i = 0; i < children.length; i += MAX_CONCURRENT) {
      const batch = children.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(batch.map(processChild));
      results.push(...batchResults);
    }

    return NextResponse.json({ ...buildSummary(results), results });
  } catch (error) {
    console.error('Weekly wrap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
