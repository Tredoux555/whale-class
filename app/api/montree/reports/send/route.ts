// /api/montree/reports/send/route.ts
// POST - Send report to parents and mark progress as reported

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getLocaleFromRequest, getTranslator, getTranslatedStatus } from '@/lib/montree/i18n/server';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { child_id, locale: requestLocale } = body;
    const locale = (requestLocale as 'en' | 'zh') || getLocaleFromRequest(request.url);
    const t = getTranslator(locale);

    if (!child_id) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Verify child belongs to the authenticated user's school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get child info
    const { data: child } = await supabase
      .from('montree_children')
      .select(`
        id, name, classroom_id, photo_url
      `)
      .eq('id', child_id)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get classroom info separately
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('name, school_id')
      .eq('id', child.classroom_id)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get last report date
    const { data: lastReport } = await supabase
      .from('montree_weekly_reports')
      .select('generated_at')
      .eq('child_id', child_id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    const lastReportDate = lastReport?.generated_at || null;

    // Get unreported progress
    let progressQuery = supabase
      .from('montree_child_progress')
      .select('work_name, area, status')
      .eq('child_id', child_id)
      .neq('status', 'not_started');

    if (lastReportDate) {
      progressQuery = progressQuery.gt('updated_at', lastReportDate);
    }

    const { data: progress } = await progressQuery;
    const works = progress || [];

    // First, check if there's a draft report with selected photos
    // The photos route creates a draft with week_start as the key
    const nowDate = new Date();
    const weekStart = new Date(nowDate);
    weekStart.setDate(nowDate.getDate() - nowDate.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Look for existing draft report with selected photos
    const { data: draftReport } = await supabase
      .from('montree_weekly_reports')
      .select('id')
      .eq('child_id', child_id)
      .eq('week_start', weekStartStr)
      .eq('report_type', 'teacher')
      .single();

    let photos: Array<{ storage_path: string; work_id: string | null; caption: string | null; captured_at: string; url: string; id: string }> = [];

    if (draftReport) {
      // Get explicitly selected photos from the junction table
      const { data: reportMedia } = await supabase
        .from('montree_report_media')
        .select('media_id, display_order')
        .eq('report_id', draftReport.id)
        .order('display_order', { ascending: true });

      if (reportMedia && reportMedia.length > 0) {
        const mediaIds = reportMedia.map(rm => rm.media_id);

        // Fetch the actual media records for selected photos
        const { data: selectedPhotos } = await supabase
          .from('montree_media')
          .select('id, storage_path, work_id, caption, captured_at')
          .in('id', mediaIds);

        if (selectedPhotos) {
          // Sort by the display_order from report_media
          const mediaOrderMap = new Map(reportMedia.map(rm => [rm.media_id, rm.display_order]));
          photos = selectedPhotos
            .sort((a, b) => (mediaOrderMap.get(a.id) || 0) - (mediaOrderMap.get(b.id) || 0))
            .map(p => ({
              id: p.id,
              storage_path: p.storage_path,
              work_id: p.work_id,
              caption: p.caption,
              captured_at: p.captured_at,
              url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${p.storage_path}`,
            }));
        }
      }
    }

    // Fallback: if no selected photos found, query by date range (backwards compatibility)
    // Include BOTH direct photos AND group photos from junction table
    if (photos.length === 0) {
      let photoQuery = supabase
        .from('montree_media')
        .select('id, storage_path, work_id, caption, captured_at')
        .eq('child_id', child_id)
        .neq('parent_visible', false);

      if (lastReportDate) {
        photoQuery = photoQuery.gt('captured_at', lastReportDate);
      }

      const { data: photoData } = await photoQuery;

      // Also fetch group photos from junction table
      const { data: groupPhotos } = await supabase
        .from('montree_media_children')
        .select(`
          media:montree_media (
            id, storage_path, work_id, caption, captured_at
          )
        `)
        .eq('child_id', child_id);

      // Combine and deduplicate
      const photoMap = new Map();
      for (const p of photoData || []) {
        photoMap.set(p.id, p);
      }
      for (const gp of groupPhotos || []) {
        if (gp.media) {
          photoMap.set(gp.media.id, gp.media);
        }
      }

      photos = Array.from(photoMap.values()).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        storage_path: p.storage_path as string,
        work_id: p.work_id as string | null,
        caption: p.caption as string | null,
        captured_at: p.captured_at as string,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${p.storage_path}`,
      }));
    }

    // Get curriculum works to map work_id to work_name for photos
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, parent_description, why_it_matters')
      .eq('classroom_id', child.classroom_id);

    const workIdToName = new Map<string, string>();
    const dbDescriptions = new Map<string, { description: string; why_it_matters: string }>();
    for (const w of curriculumWorks || []) {
      workIdToName.set(w.id, w.name);
      if (w.parent_description) {
        dbDescriptions.set(w.name.toLowerCase(), {
          description: w.parent_description,
          why_it_matters: w.why_it_matters || '',
        });
      }
    }

    // Build photo map by work name (use caption as fallback if no work_id)
    const photosByWorkName = new Map<string, { url: string; caption?: string }>();
    for (const p of photos) {
      // work_name can come from work_id lookup OR from caption (which stores work name when captured from Week view)
      const workName = p.work_id ? workIdToName.get(p.work_id) : p.caption;
      if (workName) {
        photosByWorkName.set(workName.toLowerCase(), { url: p.url, caption: p.caption || undefined });
      }
    }

    // Build report content with FULL descriptions (so parent view doesn't need to regenerate)
    const now = new Date().toISOString();

    // Helper for status labels — locale-aware for Chinese translation
    const getStatusLabel = (status: string) => {
      const normalized = status === 'completed' ? 'mastered' : status;
      return getTranslatedStatus(normalized, locale);
    };

    // Build works from progress records
    const progressWorks = works.map(w => {
      const workNameLower = (w.work_name || '').toLowerCase();
      const desc = dbDescriptions.get(workNameLower);
      const photo = photosByWorkName.get(workNameLower);

      return {
        name: w.work_name,
        chineseName: w.work_name ? getChineseNameForWork(w.work_name) : null,
        area: w.area,
        status: w.status === 'completed' ? 'mastered' : w.status,
        status_label: getStatusLabel(w.status),
        parent_description: desc?.description || null,
        why_it_matters: desc?.why_it_matters || null,
        photo_url: photo?.url || null,
        photo_caption: photo?.caption || null,
      };
    });

    // Add "documented" works — photos with work_id but no matching progress record
    // This ensures ALL photos appear in reports (consistent with gallery/preview)
    const addedWorkNames = new Set(works.map(w => (w.work_name || '').toLowerCase()));
    const documentedWorks: typeof progressWorks = [];
    for (const p of photos) {
      if (!p.work_id) continue;
      const workName = workIdToName.get(p.work_id);
      if (!workName) continue;
      if (addedWorkNames.has(workName.toLowerCase())) continue;

      const desc = dbDescriptions.get(workName.toLowerCase());
      documentedWorks.push({
        name: workName,
        chineseName: getChineseNameForWork(workName),
        area: '', // Area not available from photo alone
        status: 'documented',
        status_label: getStatusLabel('documented'),
        parent_description: desc?.description || null,
        why_it_matters: desc?.why_it_matters || null,
        photo_url: p.url,
        photo_caption: p.caption || null,
      });
      addedWorkNames.add(workName.toLowerCase());
    }

    const reportContent = {
      child: { name: child.name, photo_url: child.photo_url },
      works: [...progressWorks, ...documentedWorks],
      // Include work_name in photos for better frontend matching
      photos: photos.map(p => ({
        ...p,
        work_name: p.work_id ? workIdToName.get(p.work_id) : p.caption,
      })),
      generated_at: now,
    };

    // Calculate week start (Sunday) and end (Saturday)
    const weekEndDate = new Date(nowDate);
    weekEndDate.setDate(nowDate.getDate() + (6 - nowDate.getDay()));
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // Calculate week_number and report_year (required NOT NULL columns)
    const reportYear = weekStart.getFullYear();
    const startOfYear = new Date(reportYear, 0, 1);
    const daysSinceStart = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

    // Save report to mark as sent (upsert to handle duplicate week)
    const { error: insertError } = await supabase
      .from('montree_weekly_reports')
      .upsert({
        school_id: classroom.school_id,
        classroom_id: child.classroom_id,
        child_id: child.id,
        week_number: weekNumber,
        report_year: reportYear,
        week_start: weekStartStr,
        week_end: weekEndStr,
        report_type: 'parent',
        status: 'sent',
        content: reportContent,
        is_published: true,
        published_at: now,
        generated_at: now,
        sent_at: now,
      }, { onConflict: 'child_id,week_number,report_year' });

    if (insertError) {
      console.error('Report insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    // Get linked parents
    const { data: links } = await supabase
      .from('montree_child_parent_links')
      .select('parent_email, relationship')
      .eq('child_id', child_id)
      .eq('status', 'active');

    const parentEmails = links?.map(l => l.parent_email).filter(Boolean) || [];
    let sent = 0;

    // Send emails if we have parents and Resend is configured
    if (parentEmails.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Build email content
      const statusEmoji = (s: string) => {
        if (s === 'mastered' || s === 'completed') return '⭐';
        if (s === 'practicing') return '🔄';
        if (s === 'documented') return '📸'; // Has photo documentation
        return '🌱';
      };

      // Combine progress + documented works for email
      const allWorksForEmail = [
        ...works.map(w => ({ name: w.work_name, status: w.status })),
        ...documentedWorks.map(dw => ({ name: dw.name, status: 'documented' })),
      ];

      const worksHtml = allWorksForEmail.length > 0
        ? allWorksForEmail.map(w => {
            const cnName = w.name ? getChineseNameForWork(w.name) : null;
            const displayName = locale === 'zh' && cnName ? cnName : w.name;
            return `<li>${statusEmoji(w.status)} ${displayName}</li>`;
          }).join('')
        : `<li>${t('report.email.noProgress' as any, 'No new progress this period')}</li>`;

      const statusLegend = t('report.email.statusLegend' as any, '⭐ Mastered • 🔄 Practicing • 🌱 Introduced • 📸 Documented');

      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">🌳 ${t('report.email.subject' as any, 'Progress Update for {name}').replace('{name}', child.name)}</h2>
          <p style="color: #666;">${t('report.email.bodyIntro' as any, 'From {name}').replace('{name}', classroom?.name || 'Class')}</p>

          <h3 style="color: #333;">${t('report.email.recentPhotos' as any, 'Recent Activities')}</h3>
          <ul style="line-height: 1.8;">${worksHtml}</ul>

          ${photos && photos.length > 0 ? `<p style="color: #059669;">📸 ${t('report.email.newPhotos' as any, '{count} new photo(s) captured!').replace('{count}', photos.length.toString())}</p>` : ''}

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            ${statusLegend}
          </p>
        </div>
      `;

      for (const email of parentEmails) {
        try {
          await resend.emails.send({
            from: 'Montree <noreply@montree.xyz>',
            to: email,
            subject: `🌳 ${t('report.email.subject' as any, '{name}\'s Progress Update').replace('{name}', child.name)}`,
            html,
          });
          sent++;
        } catch (err) {
          console.error('Failed to send email to', email, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      works_count: progressWorks.length + documentedWorks.length,
      photos_count: photos?.length || 0,
    });

  } catch (error) {
    console.error('Report send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
