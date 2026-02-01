// /api/montree/reports/send/route.ts
// POST - Send report to parents and mark progress as reported

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { child_id } = body;

    if (!child_id) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
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

    // Get unreported photos
    let photoQuery = supabase
      .from('montree_media')
      .select('storage_path, work_id, captured_at')
      .eq('child_id', child_id);

    if (lastReportDate) {
      photoQuery = photoQuery.gt('captured_at', lastReportDate);
    }

    const { data: photoData } = await photoQuery;

    // Build photo URLs from storage paths
    const photos = photoData?.map(p => ({
      storage_path: p.storage_path,
      work_id: p.work_id,
      captured_at: p.captured_at,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${p.storage_path}`,
    })) || [];

    // Build report content
    const now = new Date().toISOString();
    const reportContent = {
      child: { name: child.name, photo_url: child.photo_url },
      works: works.map(w => ({
        name: w.work_name,
        area: w.area,
        status: w.status === 'completed' ? 'mastered' : w.status,
      })),
      photos: photos || [],
      generated_at: now,
    };

    // Save report to mark as reported
    await supabase
      .from('montree_weekly_reports')
      .insert({
        school_id: classroom?.school_id,
        classroom_id: child.classroom_id,
        child_id: child.id,
        week_start: now.split('T')[0],
        week_end: now.split('T')[0],
        report_type: 'progress',
        status: 'sent',
        content: reportContent,
        generated_at: now,
        sent_at: now,
      });

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
        return '🌱';
      };

      const worksHtml = works.length > 0
        ? works.map(w => `<li>${statusEmoji(w.status)} ${w.work_name}</li>`).join('')
        : '<li>No new progress this period</li>';

      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">🌳 Progress Update for ${child.name}</h2>
          <p style="color: #666;">From ${classroom?.name || 'Class'}</p>

          <h3 style="color: #333;">Recent Activities</h3>
          <ul style="line-height: 1.8;">${worksHtml}</ul>

          ${photos && photos.length > 0 ? `<p style="color: #059669;">📸 ${photos.length} new photo(s) captured!</p>` : ''}

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            ⭐ Mastered • 🔄 Practicing • 🌱 Introduced
          </p>
        </div>
      `;

      for (const email of parentEmails) {
        try {
          await resend.emails.send({
            from: 'Montree <noreply@teacherpotato.xyz>',
            to: email,
            subject: `🌳 ${child.name}'s Progress Update`,
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
      works_count: works.length,
      photos_count: photos?.length || 0,
    });

  } catch (error) {
    console.error('Report send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
