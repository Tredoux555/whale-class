// app/api/montree/reports/batch/route.ts
// Batch generate parent reports for a single child
// Called sequentially by BatchReportsCard for each child in the classroom
// POST: Generate a parent report for one child (current week)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getLocaleFromRequest, getTranslator, getTranslatedAreaName } from '@/lib/montree/i18n/server';
import { checkRateLimit } from '@/lib/rate-limiter';

const MAX_PHOTOS_PER_REPORT = 6;

// Get current week boundaries (Monday to Sunday)
function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Rate limit: 50 batch report calls per day per IP (1440 minutes = 24 hours)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await checkRateLimit(supabase, ip, '/api/montree/reports/batch', 50, 1440);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { child_id, locale: bodyLocale } = body;
    const validLocales = ['en', 'zh'];
    const rawLocale = bodyLocale || getLocaleFromRequest(request.url);
    const locale = validLocales.includes(rawLocale) ? rawLocale : 'en';
    const t = getTranslator(locale);

    if (!child_id) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { weekStart, weekEnd } = getCurrentWeekRange();

    // Parallel fetch: child info, progress this week, focus works, all progress (for stats), photos
    const [
      { data: child, error: childError },
      { data: weekProgress, error: weekError },
      { data: focusWorks, error: focusError },
      { data: allProgress, error: progressError },
      { data: mediaItems, error: mediaError },
    ] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id, name, photo_url, classroom_id')
        .eq('id', child_id)
        .maybeSingle(),
      supabase
        .from('montree_child_progress')
        .select('work_name, area, status, notes, updated_at')
        .eq('child_id', child_id)
        .gte('updated_at', `${weekStart}T00:00:00.000Z`)
        .lte('updated_at', `${weekEnd}T23:59:59.999Z`),
      supabase
        .from('montree_child_focus_works')
        .select('work_name, area, status, notes')
        .eq('child_id', child_id)
        .order('sequence', { ascending: true }),
      supabase
        .from('montree_child_progress')
        .select('status')
        .eq('child_id', child_id),
      supabase
        .from('montree_media')
        .select('id, storage_path, caption, captured_at')
        .eq('child_id', child_id)
        .neq('parent_visible', false)
        .gte('captured_at', `${weekStart}T00:00:00.000Z`)
        .lte('captured_at', `${weekEnd}T23:59:59.999Z`)
        .limit(MAX_PHOTOS_PER_REPORT),
    ]);

    if (childError || !child) {
      console.error('[Batch Reports] Child fetch error:', childError);
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    if (!child.classroom_id) {
      return NextResponse.json({ success: false, error: 'Child missing classroom' }, { status: 500 });
    }

    // Log non-fatal query errors for debugging
    if (weekError) console.error('[Batch Reports] Week progress error for child:', child_id, weekError);
    if (focusError) console.error('[Batch Reports] Focus works error for child:', child_id, focusError);
    if (progressError) console.error('[Batch Reports] All progress error for child:', child_id, progressError);
    if (mediaError) console.error('[Batch Reports] Media error for child:', child_id, mediaError);

    const firstName = child.name?.split(' ')[0] || 'Child';

    // Calculate overall stats
    const stats = { presented: 0, practicing: 0, mastered: 0, total: allProgress?.length || 0 };
    for (const p of allProgress || []) {
      const s = p.status;
      if (s === 1 || s === 'presented') stats.presented++;
      else if (s === 2 || s === 'practicing') stats.practicing++;
      else if (s === 3 || s === 'mastered' || s === 'completed') stats.mastered++;
    }

    // Group week's progress by area
    const worksByArea: Record<string, string[]> = {};
    for (const p of weekProgress || []) {
      if (!worksByArea[p.area]) worksByArea[p.area] = [];
      if (!worksByArea[p.area].includes(p.work_name)) {
        worksByArea[p.area].push(p.work_name);
      }
    }

    // Build areas explored
    const areasExplored = Object.entries(worksByArea).map(([area, works]) => ({
      area_name: getTranslatedAreaName(area, locale),
      area_key: area,
      works: works.slice(0, 4),
      work_count: works.length,
    }));

    // Build focus works summary (current shelf)
    const focusSummary = (focusWorks || []).slice(0, 5).map(fw => ({
      name: fw.work_name,
      area: fw.area,
      status: fw.status,
    }));

    // Build photo URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const photos = supabaseUrl
      ? (mediaItems || []).map(item => ({
          url: `${supabaseUrl}/storage/v1/object/public/montree-media/${item.storage_path}`,
          caption: item.caption,
        }))
      : [];

    // Build the report content
    const worksThisWeek = weekProgress?.length || 0;
    const hasActivity = worksThisWeek > 0 || (focusWorks?.length || 0) > 0;

    // Greeting — using i18n keys
    const greeting = hasActivity
      ? t('report.generate.activeWeek' as any, `${firstName} had an active and engaged week!`).replace('{name}', firstName)
      : t('report.generate.wonderfulWeek' as any, `${firstName} had a wonderful week in the classroom!`).replace('{name}', firstName);

    // Highlights — using i18n keys
    const highlights: string[] = [];
    if (worksThisWeek > 0) {
      highlights.push(
        t('report.generate.excellentFocus' as any, `${firstName} demonstrated excellent focus during work time.`).replace('{name}', firstName)
      );
    }
    if (stats.mastered > 0) {
      highlights.push(
        t('batchReports.masteredCount' as any, `${firstName} has mastered {count} works — amazing!`)
          .replace('{name}', firstName)
          .replace('{count}', String(stats.mastered))
      );
    }

    // Home suggestions — using i18n keys
    const homeSuggestions: string[] = [
      t('report.generate.encourageIndependence' as any, 'Continue encouraging independence at home — let them help with simple tasks!'),
      t('report.generate.readTogether' as any, 'Read together daily and point out letters in the environment.'),
    ];

    // Closing — using i18n keys
    const closing = t('report.generate.loveHaving' as any, `We love having ${firstName} in our classroom. See you next week!`)
      .replace('{name}', firstName);

    const reportContent = {
      child: { name: child.name, photo_url: child.photo_url },
      week: { start: weekStart, end: weekEnd },
      summary: {
        works_this_week: worksThisWeek,
        photos_this_week: photos.length,
        overall_progress: stats,
      },
      greeting,
      highlights,
      areas_explored: areasExplored,
      focus_works: focusSummary,
      home_suggestions: homeSuggestions,
      closing,
      photos,
      generated_at: new Date().toISOString(),
    };

    // Save report to montree_weekly_reports
    const { data: report, error: saveError } = await supabase
      .from('montree_weekly_reports')
      .insert({
        school_id: auth.schoolId,
        classroom_id: child.classroom_id,
        child_id: child.id,
        week_start: weekStart,
        week_end: weekEnd,
        report_type: 'batch_parent',
        status: 'draft',
        content: reportContent,
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[Batch Reports] Save error for child:', child_id, saveError);
      return NextResponse.json({ success: false, error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report_id: report?.id,
      child_name: child.name,
      summary: {
        works_this_week: worksThisWeek,
        areas_count: areasExplored.length,
        photos_count: photos.length,
        mastered: stats.mastered,
        practicing: stats.practicing,
      },
    });

  } catch (error) {
    console.error('[Batch Reports] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
