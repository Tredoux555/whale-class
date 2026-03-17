// /api/montree/reports/send/route.ts
// POST - Send report to parents and mark progress as reported

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getLocaleFromRequest, getTranslator, getTranslatedStatus, getTranslatedAreaName } from '@/lib/montree/i18n/server';
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

    // Build works from progress records — ONLY include works with photos
    // Reports are photo-centric: no photo = not in report
    const progressWorks: Array<{
      name: string;
      chineseName: string | null;
      area: string;
      status: string;
      status_label: string;
      parent_description: string | null;
      why_it_matters: string | null;
      photo_url: string | null;
      photo_caption: string | null;
    }> = [];
    for (const w of works) {
      const workNameLower = (w.work_name || '').toLowerCase();
      const desc = dbDescriptions.get(workNameLower);
      const photo = photosByWorkName.get(workNameLower);

      // Include ALL works in report — not just photo-captured ones
      progressWorks.push({
        name: w.work_name,
        chineseName: w.work_name ? getChineseNameForWork(w.work_name) : null,
        area: w.area,
        status: w.status === 'completed' ? 'mastered' : w.status,
        status_label: getStatusLabel(w.status),
        parent_description: desc?.description || null,
        why_it_matters: desc?.why_it_matters || null,
        photo_url: photo?.url || null,
        photo_caption: photo?.caption || null,
      });
    }

    // Add "documented" works — photos with work_id but no matching progress record
    // This ensures ALL photos appear in reports (consistent with gallery/preview)
    // Use progressWorks (photo-filtered) for deduplication — not raw works
    const addedWorkNames = new Set(progressWorks.map(w => (w.name || '').toLowerCase()));
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

    // --- Narrative Generation ---
    const allWorks = [...progressWorks, ...documentedWorks];
    const firstName = child.name?.split(' ')[0] || child.name || '';

    // Group works by area for structured display
    const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const worksByArea: Record<string, typeof allWorks> = {};
    for (const w of allWorks) {
      const area = w.area || 'other';
      if (!worksByArea[area]) worksByArea[area] = [];
      worksByArea[area].push(w);
    }
    const areasExplored = AREA_ORDER
      .filter(a => worksByArea[a] && worksByArea[a].length > 0)
      .map(a => ({
        area_key: a,
        area_name: getTranslatedAreaName(a, locale),
        works: worksByArea[a],
      }));
    // Add any "other" areas not in AREA_ORDER
    for (const [area, works] of Object.entries(worksByArea)) {
      if (!AREA_ORDER.includes(area) && works.length > 0) {
        areasExplored.push({
          area_key: area,
          area_name: getTranslatedAreaName(area, locale),
          works,
        });
      }
    }

    // Greeting
    const masteredCount = allWorks.filter(w => w.status === 'mastered').length;
    const greeting = allWorks.length > 3
      ? t('report.generate.activeWeek' as any, '{name} had an active and engaged week!').replace('{name}', firstName)
      : t('report.generate.wonderfulWeek' as any, '{name} had a wonderful week in the classroom!').replace('{name}', firstName);

    // Highlights
    const highlights: string[] = [];
    if (allWorks.length > 0) {
      highlights.push(
        t('report.generate.excellentFocus' as any, '{name} demonstrated excellent focus during work time.').replace('{name}', firstName)
      );
    }
    if (masteredCount > 0) {
      highlights.push(
        t('batchReports.masteredCount' as any, '{name} has mastered {count} works — amazing!')
          .replace('{name}', firstName)
          .replace('{count}', String(masteredCount))
      );
    }
    if (areasExplored.length >= 3) {
      highlights.push(
        t('report.generate.specialInterest' as any, '{name} is showing special interest in the {area} area.')
          .replace('{name}', firstName)
          .replace('{area}', areasExplored[0].area_name.toLowerCase())
      );
    }

    // Home suggestions
    const recommendations: string[] = [
      t('report.generate.encourageIndependence' as any, 'Continue encouraging independence at home — let them help with simple tasks!'),
      t('report.generate.readTogether' as any, 'Read together daily and point out letters in the environment.'),
      t('report.generate.sortAndCount' as any, 'Provide opportunities for sorting, counting, and organizing.'),
    ];

    // Closing
    const closing = t('report.generate.loveHaving' as any, 'We love having {name} in our classroom. See you next week!').replace('{name}', firstName);

    // --- Inspiring Montessori Progress Summary ---
    // Bridges the gap between the previous report and this one, showing developmental progress
    let parentSummary = '';
    {
      const totalWorks = allWorks.length;
      const areasCount = areasExplored.length;
      const masteredNames = allWorks.filter(w => w.status === 'mastered').map(w => w.name);
      const practicingNames = allWorks.filter(w => w.status === 'practicing').map(w => w.name);

      // Fetch the previous report to compare
      const { data: prevReport } = await supabase
        .from('montree_weekly_reports')
        .select('content')
        .eq('child_id', child_id)
        .eq('status', 'sent')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevWorks = (prevReport?.content as Record<string, unknown>)?.works as Array<{ name: string; status: string }> | undefined;
      const prevMasteredSet = new Set((prevWorks || []).filter(w => w.status === 'mastered').map(w => w.name));
      const newlyMastered = masteredNames.filter(n => !prevMasteredSet.has(n));
      const prevWorkNames = new Set((prevWorks || []).map(w => w.name));
      const brandNewWorks = allWorks.filter(w => !prevWorkNames.has(w.name));

      if (locale === 'zh') {
        // Chinese summary
        const parts: string[] = [];
        if (prevReport) {
          parts.push(`自上次报告以来，${firstName}一直在稳步成长。`);
          if (newlyMastered.length > 0) {
            parts.push(`${firstName}新掌握了${newlyMastered.length}项工作${newlyMastered.length <= 3 ? '（' + newlyMastered.map(n => getChineseNameForWork(n) || n).join('、') + '）' : ''}——这展现了出色的专注力和毅力。`);
          }
          if (brandNewWorks.length > 0) {
            parts.push(`本周还探索了${brandNewWorks.length}项全新的活动，表现出强烈的好奇心和学习热情。`);
          }
        } else {
          parts.push(`这是${firstName}的第一份学习报告！`);
        }

        if (areasCount >= 3) {
          parts.push(`${firstName}在${areasCount}个不同领域都有活动——这种全面的探索正是蒙特梭利教育的精髓所在。`);
        }
        if (practicingNames.length > 0) {
          parts.push(`正在练习的工作说明${firstName}正处于深入学习的过程中——在蒙特梭利教育中，重复是通往精通的道路。`);
        }
        if (totalWorks >= 5) {
          parts.push(`本周${totalWorks}项活动的参与度令人印象深刻，展现了内在的学习动力。`);
        }
        parentSummary = parts.join('');
      } else {
        // English summary
        const parts: string[] = [];
        if (prevReport) {
          parts.push(`Since the last report, ${firstName} has been making steady progress.`);
          if (newlyMastered.length > 0) {
            parts.push(`${firstName} has newly mastered ${newlyMastered.length} ${newlyMastered.length === 1 ? 'work' : 'works'}${newlyMastered.length <= 3 ? ' (' + newlyMastered.join(', ') + ')' : ''} — showing wonderful focus and determination.`);
          }
          if (brandNewWorks.length > 0) {
            parts.push(`They also explored ${brandNewWorks.length} brand new ${brandNewWorks.length === 1 ? 'activity' : 'activities'} this week, showing a strong drive to discover and learn.`);
          }
        } else {
          parts.push(`This is ${firstName}'s very first learning report!`);
        }

        if (areasCount >= 3) {
          parts.push(`${firstName} was active across ${areasCount} different areas — this kind of well-rounded exploration is at the heart of Montessori education.`);
        }
        if (practicingNames.length > 0) {
          parts.push(`The works still being practiced show that ${firstName} is in the midst of deep learning — in Montessori, repetition is the path to mastery.`);
        }
        if (totalWorks >= 5) {
          parts.push(`With ${totalWorks} activities this week, ${firstName} is showing impressive internal motivation and engagement.`);
        }
        parentSummary = parts.join(' ');
      }
    }

    const reportContent = {
      child: { name: child.name, photo_url: child.photo_url },
      greeting,
      parent_summary: parentSummary,
      highlights,
      areas_explored: areasExplored,
      areas_of_growth: areasExplored.map(a => a.area_name),
      recommendations,
      closing,
      works: allWorks,
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

      // Combine progress + documented works for email — use FILTERED lists (photo-only)
      const allWorksForEmail = [
        ...progressWorks.map(w => ({ name: w.name, status: w.status })),
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
