// /api/montree/reports/batch-narratives/route.ts
// POST: Generate Sonnet-written narratives for all children in a classroom for a given week
// Also handles single-child generation when child_ids has one entry
//
// Body: {
//   classroom_id: string,
//   week_start: string,     // YYYY-MM-DD
//   week_end: string,       // YYYY-MM-DD
//   child_ids?: string[],   // optional subset — all children if omitted
//   locale?: 'en' | 'zh',
//   force_regenerate?: boolean
// }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { analyzeWeeklyProgress } from '@/lib/montree/ai';
import { generateWeeklyNarrative, NarrativeInput } from '@/lib/montree/reports/narrative-generator';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';
import { getChineseDescriptionsMap } from '@/lib/curriculum/comprehensive-guides/parent-descriptions-zh';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

// Max concurrent Sonnet calls to avoid rate limiting
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
    } = body;

    if (!classroom_id || !week_start || !week_end) {
      return NextResponse.json(
        { error: 'classroom_id, week_start, and week_end are required' },
        { status: 400 }
      );
    }

    // Validate date format
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

    const classroom = classroomRaw as { id: string; name: string; school_id: string } | null;
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or access denied' }, { status: 403 });
    }

    // Get children — either requested subset or all active in classroom
    let childQuery = supabase
      .from('montree_children')
      .select('id, name, date_of_birth, classroom_id')
      .eq('classroom_id', classroom_id)
      .eq('is_active', true);

    if (requestedChildIds && requestedChildIds.length > 0) {
      childQuery = childQuery.in('id', requestedChildIds);
    }

    const { data: childrenRaw } = await childQuery;
    const children = (childrenRaw || []) as Array<{ id: string; name: string; date_of_birth: string; classroom_id: string }>;
    if (children.length === 0) {
      return NextResponse.json({ error: 'No children found' }, { status: 404 });
    }

    // Load curriculum works + visual memory + descriptions (shared across all children)
    const [curriculumRes, visualRes] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, parent_description, why_it_matters, parent_description_zh, why_it_matters_zh, name_zh, area_id')
        .eq('classroom_id', classroom_id),
      supabase
        .from('montree_visual_memory')
        .select('work_name, parent_description, why_it_matters')
        .eq('classroom_id', classroom_id)
        .not('parent_description', 'is', null),
    ]);

    const curriculumWorks = (curriculumRes.data || []) as Array<{
      id: string; name: string; parent_description: string | null; why_it_matters: string | null;
      parent_description_zh: string | null; why_it_matters_zh: string | null; name_zh: string | null; area_id: string | null;
    }>;
    const visualMemories = (visualRes.data || []) as Array<{
      work_name: string; parent_description: string | null; why_it_matters: string | null;
    }>;

    // Build description lookup (same logic as send/route.ts)
    const workIdToName = new Map<string, string>();
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    for (const w of curriculumWorks || []) {
      workIdToName.set(w.id, w.name);
      const desc = (locale === 'zh' && w.parent_description_zh) ? w.parent_description_zh : w.parent_description;
      const whyMatters = (locale === 'zh' && w.why_it_matters_zh) ? w.why_it_matters_zh : (w.why_it_matters || '');
      if (desc) {
        dbDescriptions.set(w.name.toLowerCase().trim(), { description: desc, why_it_matters: whyMatters });
      }
    }

    // Chinese descriptions override
    if (locale === 'zh') {
      const zhDescriptions = getChineseDescriptionsMap();
      for (const [name, zh] of zhDescriptions) {
        dbDescriptions.set(name, { description: zh.parent_description, why_it_matters: zh.why_it_matters });
      }
    }

    // Visual memory overrides (most specific)
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

    // Check for existing reports with narratives (skip if not force_regenerate)
    const existingReports = new Map<string, { id: string; content: Record<string, unknown> }>();
    if (!force_regenerate) {
      // Calculate week number for upsert key
      const weekStartDate = new Date(week_start);
      const reportYear = weekStartDate.getFullYear();
      const startOfYear = new Date(reportYear, 0, 1);
      const daysSinceStart = Math.floor((weekStartDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

      const { data: existingData } = await supabase
        .from('montree_weekly_reports')
        .select('id, child_id, content')
        .in('child_id', children.map(c => c.id))
        .eq('week_number', weekNumber)
        .eq('report_year', reportYear)
        .eq('report_type', 'parent');

      for (const r of (existingData || []) as Array<{ id: string; child_id: string; content: Record<string, unknown> }>) {
        const content = r.content;
        if (content?.narrative) {
          existingReports.set(r.child_id, { id: r.id, content });
        }
      }
    }

    // Process each child — generate narrative
    const results: Array<{
      child_id: string;
      child_name: string;
      success: boolean;
      skipped?: boolean;
      photo_count: number;
      narrative?: string;
      tokens_used?: { input: number; output: number };
      error?: string;
    }> = [];

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < children.length; i += MAX_CONCURRENT) {
      const batch = children.slice(i, i + MAX_CONCURRENT);

      const batchResults = await Promise.all(
        batch.map(async (child) => {
          try {
            // Skip if already has narrative and not force
            if (existingReports.has(child.id)) {
              return {
                child_id: child.id,
                child_name: child.name,
                success: true,
                skipped: true,
                photo_count: 0,
                narrative: (existingReports.get(child.id)!.content.narrative as { summary?: string })?.summary || '',
              };
            }

            // Fetch this child's progress + photos for the week in parallel
            const fourWeeksAgo = new Date(week_start);
            fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

            const [progressRes, historicalRes, photosRes, groupPhotosRes] = await Promise.all([
              supabase
                .from('montree_child_progress')
                .select('work_name, area, status, notes, created_at, duration_minutes, repetition_count')
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

            type ProgressRecord = { work_name: string; area: string; status: string; notes?: string; created_at: string; duration_minutes?: number; repetition_count?: number };
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
                // Filter by week dates
                const capturedDate = gp.media.captured_at?.split('T')[0] || '';
                if (capturedDate >= week_start && capturedDate <= week_end) {
                  photoMap.set(gp.media.id, gp.media);
                }
              }
            }
            const photos = Array.from(photoMap.values());

            // Build photo data with descriptions
            const enrichedPhotos: NarrativeInput['photos'] = [];
            for (const photo of photos) {
              const workName = photo.work_id ? workIdToName.get(photo.work_id) : photo.caption;
              if (!workName) continue;

              const desc = dbDescriptions.get(workName.toLowerCase().trim());
              // Find matching progress record for status
              const matchingProgress = progress.find(
                p => p.work_name.toLowerCase() === workName.toLowerCase()
              );

              enrichedPhotos.push({
                work_name: workName,
                area: matchingProgress?.area || '',
                status: matchingProgress?.status || 'documented',
                parent_description: desc?.description || null,
                why_it_matters: desc?.why_it_matters || null,
                caption: photo.caption,
              });
            }

            // Run weekly analysis
            const childAge = child.date_of_birth
              ? (Date.now() - new Date(child.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
              : 4; // default age if unknown

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
                area: p.area,
                status: p.status,
                notes: p.notes,
                date: p.created_at,
                duration_minutes: p.duration_minutes,
                repetition_count: p.repetition_count,
              })),
              historicalProgress: historical.map(p => ({
                work_name: p.work_name,
                area: p.area,
                status: p.status,
                date: p.created_at,
              })),
              availableWorks: (curriculumWorks || []).map(w => ({
                id: w.id,
                name: w.name,
                area: w.area_id || '',
              })),
            });

            // Generate narrative via Sonnet
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
              photos: enrichedPhotos,
            });

            // Build full report content for storage
            // Pre-build photo lookup by work name for O(1) access
            const photoByWorkName = new Map<string, PhotoRecord>();
            for (const ph of photos) {
              const phWorkName = ph.work_id ? workIdToName.get(ph.work_id) : ph.caption;
              if (phWorkName) photoByWorkName.set(phWorkName.toLowerCase(), ph);
            }

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

            // Build report content (compatible with existing parent report page)
            const now = new Date().toISOString();
            const weekStartDate = new Date(week_start);
            const reportYear = weekStartDate.getFullYear();
            const startOfYear = new Date(reportYear, 0, 1);
            const daysSinceStart = Math.floor((weekStartDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

            const reportContent = {
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

            // Upsert report
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: upsertError } = await (supabase
              .from('montree_weekly_reports') as any)
              .upsert({
                school_id: classroom.school_id,
                classroom_id: classroom_id,
                child_id: child.id,
                week_number: weekNumber,
                report_year: reportYear,
                week_start: week_start,
                week_end: week_end,
                report_type: 'parent',
                status: 'draft', // Teacher must approve before sending
                content: reportContent,
                is_published: false,
                generated_at: now,
              }, { onConflict: 'child_id,week_number,report_year' });

            if (upsertError) {
              console.error(`Report upsert error for ${child.name}:`, upsertError);
              return {
                child_id: child.id,
                child_name: child.name,
                success: false,
                photo_count: enrichedPhotos.length,
                error: upsertError.message,
              };
            }

            return {
              child_id: child.id,
              child_name: child.name,
              success: true,
              photo_count: enrichedPhotos.length,
              narrative: narrativeResult.narrative,
              tokens_used: narrativeResult.tokensUsed,
            };
          } catch (err) {
            console.error(`Narrative generation error for ${child.name}:`, err);
            return {
              child_id: child.id,
              child_name: child.name,
              success: false,
              photo_count: 0,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          }
        })
      );

      results.push(...batchResults);
    }

    // Calculate total cost
    const totalInputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.input || 0), 0);
    const totalOutputTokens = results.reduce((sum, r) => sum + (r.tokens_used?.output || 0), 0);
    // Sonnet pricing: $3/M input, $15/M output
    const estimatedCost = (totalInputTokens * 3 + totalOutputTokens * 15) / 1_000_000;

    return NextResponse.json({
      success: true,
      generated: results.filter(r => r.success && !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      failed: results.filter(r => !r.success).length,
      total: results.length,
      cost_usd: Math.round(estimatedCost * 1000) / 1000,
      results,
    });

  } catch (error) {
    console.error('Batch narratives error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
