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
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { replanChildInProcess } from '@/lib/montree/reports/replan-child';
import { generateAndSaveEnglishSchedule } from '@/app/api/montree/dashboard/english-schedule/route';
import { anthropic } from '@/lib/ai/anthropic';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getChineseDescriptionsMap } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

export const maxDuration = 300; // 5 minutes — full classroom run

// Concurrency tuned for Haiku (default tier). Sonnet runs through the same path
// but Haiku has more rate-limit headroom, so 5 in flight is comfortable.
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

    // Resolve this school's AI tier (free / haiku / sonnet) — fail-closed to free on error
    const aiTier = await resolveReportModel(supabase, classroom.school_id);
    if (aiTier.tier === 'free') {
      return NextResponse.json({
        error: 'AI report generation requires an AI tier (haiku or sonnet). Contact support to enable.',
        tier: 'free',
      }, { status: 402 });
    }
    console.log(`[WeeklyWrap] School ${classroom.school_id} — tier=${aiTier.tier} model=${aiTier.model}`);

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
        .select('id, name, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh, name_zh, name_chinese, area_id')
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
      parent_description_zh: string | null; why_it_matters_zh: string | null; name_zh: string | null; name_chinese: string | null; area_id: string | null;
    }>;
    const visualMemories = (visualRes.data || []) as Array<{
      work_name: string; parent_description: string | null; why_it_matters: string | null;
    }>;

    // Build area UUID → canonical area_key map (e.g. "8ed822b1-..." → "mathematics")
    const areaIdToKey = new Map<string, string>();
    for (const a of (areasRes.data || []) as Array<{ id: string; area_key: string }>) {
      areaIdToKey.set(a.id, a.area_key);
    }

    // Fuzzy description lookup: strips suffixes like "- No lines", "- Rectangular Box"
    // and normalizes spacing so "Chalk Board Writing" matches "Chalkboard Writing"
    const fuzzyDescriptionLookup = (
      name: string,
      descs: Map<string, { description: string; why_it_matters: string }>
    ): { description: string; why_it_matters: string } | undefined => {
      const key = name.toLowerCase().trim();
      // Exact match first
      const exact = descs.get(key);
      if (exact) return exact;
      // Strip " - suffix" variants (e.g. "Constructive Triangles - Rectangular Box" → "constructive triangles")
      const base = key.replace(/\s*-\s*.+$/, '').trim();
      if (base !== key) {
        const baseMatch = descs.get(base);
        if (baseMatch) return baseMatch;
      }
      // Normalize spaces (e.g. "chalk board" → "chalkboard")
      const collapsed = base.replace(/\s+/g, '');
      for (const [dKey, dVal] of descs) {
        if (dKey.replace(/\s+/g, '') === collapsed) return dVal;
      }
      // Substring match: if a description key is contained in the name
      for (const [dKey, dVal] of descs) {
        if (dKey.length > 5 && key.includes(dKey)) return dVal;
      }
      return undefined;
    };

    // Build description + area lookups
    const workIdToName = new Map<string, string>();
    const workNameToArea = new Map<string, string>(); // name (lowercase) → area_key (canonical)
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    // DB Chinese-name fallback for custom works not in static JSON
    // Priority: static JSON (getChineseNameForWork) → DB name_chinese fallback (dbChineseMap)
    const dbChineseMap = new Map<string, string>();
    for (const w of curriculumWorks) {
      workIdToName.set(w.id, w.name);
      if (w.area_id) {
        // Resolve UUID to canonical area key (e.g. "mathematics", "language")
        const areaKey = areaIdToKey.get(w.area_id) || w.area_id;
        workNameToArea.set(w.name.toLowerCase().trim(), areaKey);
      }
      if (w.name_chinese && w.name) {
        dbChineseMap.set(w.name.toLowerCase().trim(), w.name_chinese);
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
          const vmKey = vm.work_name.toLowerCase().trim();
          // Don't overwrite Chinese descriptions with English visual memory
          if (locale === 'zh' && dbDescriptions.has(vmKey)) continue;
          dbDescriptions.set(vmKey, {
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
                .or('identification_status.is.null,identification_status.neq.pending_review')
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

              const desc = fuzzyDescriptionLookup(workName, dbDescriptions);
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
            const upsertFailures: string[] = [];

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
                model: aiTier.model ?? undefined,
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
                upsertFailures.push(`teacher: ${teacherUpsertErr.message}`);
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
                model: aiTier.model ?? undefined,
              });

              parentNarrative = narrativeResult.narrative;
              if (narrativeResult.tokensUsed) {
                totalTokens.input += narrativeResult.tokensUsed.input;
                totalTokens.output += narrativeResult.tokensUsed.output;
              }

              // Build parent report content
              const allWorks = enrichedPhotos.map(p => ({
                name: p.work_name,
                chineseName: locale === 'zh'
                  ? (getChineseNameForWork(p.work_name) || dbChineseMap.get(p.work_name.toLowerCase().trim()) || null)
                  : null,
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
                upsertFailures.push(`parent: ${parentUpsertErr.message}`);
              }
            }

            const keyInsight = (teacherReportContent as any)?.key_insight || '';
            const flagsCount = (analysis.red_flags.length + analysis.yellow_flags.length);

            // If any upsert silently failed, surface it as a real failure so the stream event
            // can show the actual DB error instead of masking it with success=true.
            if (upsertFailures.length > 0) {
              return {
                child_id: child.id,
                child_name: child.name,
                success: false,
                photo_count: enrichedPhotos.length,
                error: `DB upsert failed — ${upsertFailures.join('; ')}`,
                tokens_used: totalTokens.input > 0 ? totalTokens : undefined,
              };
            }

            // ─── Stage 6: Wrap up the week — refresh game plan + advance focus shelf ───
            // Tier-aware (uses aiTier.model). Failure here MUST NOT fail the report —
            // the upserts above already succeeded. Replan failure is logged + surfaced
            // via NDJSON so the UI can show what didn't roll over.
            let replanResult: { replanned: boolean; works: string[]; error?: string } = {
              replanned: false,
              works: [],
            };
            if (anthropic && aiTier.model) {
              try {
                replanResult = await replanChildInProcess({
                  childId: child.id,
                  childName: child.name,
                  classroomId: classroom_id,
                  locale,
                  anthropic,
                  model: aiTier.model,
                  supabase,
                });
              } catch (replanErr) {
                const msg = replanErr instanceof Error ? replanErr.message : 'unknown';
                console.error(`[WeeklyWrap] Replan threw for ${child.name}:`, replanErr);
                replanResult = { replanned: false, works: [], error: `wrap: ${msg}` };
              }
            } else {
              replanResult = { replanned: false, works: [], error: 'wrap: anthropic/model unavailable' };
            }

            return {
              child_id: child.id,
              child_name: child.name,
              success: true,
              photo_count: enrichedPhotos.length,
              teacher_report_preview: keyInsight,
              parent_narrative: parentNarrative,
              flags_count: flagsCount,
              tokens_used: totalTokens.input > 0 ? totalTokens : undefined,
              replanned: replanResult.replanned,
              replan_works: replanResult.works,
              replan_error: replanResult.error,
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

    // Helper: build final summary from results — tier-aware cost calculation.
    // Pricing per million tokens (input, output):
    //   haiku  → claude-haiku-4-5    $0.80 in / $4.00 out
    //   sonnet → claude-sonnet-4-6   $3.00 in / $15.00 out
    function buildSummary(results: Array<{ success: boolean; skipped?: boolean; tokens_used?: { input: number; output: number } }>) {
      const totalInputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.input || 0), 0);
      const totalOutputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.output || 0), 0);
      const PRICING: Record<string, [number, number]> = {
        haiku: [0.8, 4],
        sonnet: [3, 15],
      };
      const [inPrice, outPrice] = PRICING[aiTier.tier] ?? PRICING.sonnet;
      const estimatedCost = (totalInputTokens * inPrice + totalOutputTokens * outPrice) / 1_000_000;
      return {
        success: true,
        generated: results.filter(r => r.success && !r.skipped).length,
        skipped: results.filter(r => r.skipped).length,
        failed: results.filter(r => !r.success).length,
        total: results.length,
        cost_usd: Math.round(estimatedCost * 1000) / 1000,
        ai_tier: aiTier.tier,
        ai_model: aiTier.model,
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
                  error: r.success ? undefined : (r as any).error,
                }) + '\n'));

                // Surface the per-child replan outcome (game plan + shelf advance).
                // Only emitted when the report itself succeeded — replan only ran in
                // that branch. Replan can succeed=true even when the report's success=true,
                // but if replan errored we still send the event with replanned=false + error.
                if (r.success) {
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'replan_done',
                    child_name: (r as any).child_name,
                    replanned: (r as any).replanned || false,
                    works: (r as any).replan_works || [],
                    error: (r as any).replan_error,
                  }) + '\n'));
                }
              }
            }

            // Send complete event
            const summary = buildSummary(results);
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'complete', ...summary, results,
            }) + '\n'));

            // Fire-and-forget: generate next week's English schedule
            generateAndSaveEnglishSchedule(classroom_id, school_id)
              .catch(err => console.error('[WeeklyWrap] English schedule generation failed:', err));

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

    // Fire-and-forget: generate next week's English schedule
    generateAndSaveEnglishSchedule(classroom_id, school_id)
      .catch(err => console.error('[WeeklyWrap] English schedule generation failed:', err));

    return NextResponse.json({ ...buildSummary(results), results });
  } catch (error) {
    console.error('Weekly wrap error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
