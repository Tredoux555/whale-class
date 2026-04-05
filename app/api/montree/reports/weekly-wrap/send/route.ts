// /api/montree/reports/weekly-wrap/send/route.ts
// POST: Bulk publish all parent report drafts for a week and send emails
//
// Body: {
//   classroom_id: string,
//   week_start: string,    // YYYY-MM-DD Monday
//   locale?: 'en' | 'zh'
// }

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { Resend } from 'resend';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getLocaleFromRequest } from '@/lib/montree/i18n/server';


export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { classroom_id, week_start, locale: requestLocale } = body;

    if (!classroom_id || !week_start) {
      return NextResponse.json(
        { error: 'classroom_id and week_start are required' },
        { status: 400 }
      );
    }

    const locale = (requestLocale as 'en' | 'zh') || getLocaleFromRequest(request.url);

    // Verify classroom belongs to this school (cross-pollination guard)
    const { data: classroomOwnership } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomOwnership) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Get all parent draft reports for this week
    const { data: draftsRaw } = await supabase
      .from('montree_weekly_reports')
      .select('id, child_id, content, week_start, week_end')
      .eq('classroom_id', classroom_id)
      .eq('week_start', week_start)
      .eq('report_type', 'parent')
      .eq('status', 'draft');

    const drafts = (draftsRaw || []) as Array<{
      id: string; child_id: string; content: Record<string, unknown>;
      week_start: string; week_end: string;
    }>;

    if (drafts.length === 0) {
      return NextResponse.json({ error: 'No parent report drafts found for this week' }, { status: 404 });
    }

    // Get children + parent links
    const childIds = drafts.map(d => d.child_id);
    const [{ data: childrenRaw }, { data: linksRaw }, { data: classroomRaw }] = await Promise.all([
      supabase
        .from('montree_children')
        .select('id, name')
        .in('id', childIds),
      supabase
        .from('montree_child_parent_links')
        .select('child_id, parent_email, relationship')
        .in('child_id', childIds)
        .eq('status', 'active'),
      supabase
        .from('montree_classrooms')
        .select('name')
        .eq('id', classroom_id)
        .maybeSingle(),
    ]);

    const children = (childrenRaw || []) as Array<{ id: string; name: string }>;
    const links = (linksRaw || []) as Array<{ child_id: string; parent_email: string; relationship: string }>;
    const classroomName = (classroomRaw as { name: string } | null)?.name || '';

    const childMap = new Map(children.map(c => [c.id, c.name]));
    const linksByChild = new Map<string, string[]>();
    for (const l of links) {
      if (l.parent_email) {
        const emails = linksByChild.get(l.child_id) || [];
        emails.push(l.parent_email);
        linksByChild.set(l.child_id, emails);
      }
    }

    const now = new Date().toISOString();
    let published = 0;
    let emailsSent = 0;
    const errors: Array<{ child_id: string; error: string }> = [];

    // Process each draft
    for (const draft of drafts) {
      try {
        // Mark as sent
        const { error: updateErr } = await supabase
          .from('montree_weekly_reports')
          .update({
            status: 'sent',
            sent_at: now,
          })
          .eq('id', draft.id);

        if (updateErr) {
          errors.push({ child_id: draft.child_id, error: updateErr.message });
          continue;
        }
        published++;

        // Also mark teacher report for this child as approved
        const { error: teacherUpdateErr } = await supabase
          .from('montree_weekly_reports')
          .update({ status: 'approved', approved_at: now })
          .eq('child_id', draft.child_id)
          .eq('week_start', week_start)
          .eq('report_type', 'teacher');

        if (teacherUpdateErr) {
          console.error(`Teacher report approval failed for ${draft.child_id}:`, teacherUpdateErr.message);
        }

        // Send emails
        const parentEmails = linksByChild.get(draft.child_id) || [];
        if (parentEmails.length > 0 && process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const childName = childMap.get(draft.child_id) || 'Child';
          const firstName = childName.split(' ')[0];
          const narrative = (draft.content?.narrative as { summary?: string })?.summary || '';
          const photosCount = ((draft.content?.photos as unknown[]) || []).length;
          const reportLink = `https://montree.xyz/montree/parent/report/${draft.id}`;

          // Format week display
          const weekStartStr = draft.week_start || '';
          const weekEndStr = draft.week_end || '';
          const startFmt = weekStartStr ? new Date(weekStartStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }) : '';
          const endFmt = weekEndStr ? new Date(weekEndStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' }) : '';
          const weekDisplay = startFmt && endFmt ? `${startFmt} – ${endFmt}` : week_start;

          const html = narrative
            ? `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #059669;">🌳 ${firstName}${locale === 'zh' ? '的每周学习报告' : "'s Weekly Update"}</h2>
              <p style="color: #666; font-size: 13px;">${classroomName} · ${weekDisplay}</p>
              <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #333; line-height: 1.7; font-size: 15px; margin: 0;">${narrative}</p>
              </div>
              ${photosCount > 0 ? `<p style="color: #666; font-size: 14px;">📸 ${photosCount} ${locale === 'zh' ? '张照片等您查看' : 'photos to explore'}</p>` : ''}
              <div style="text-align: center; margin: 24px 0;">
                <a href="${reportLink}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ${locale === 'zh' ? '查看完整报告' : 'View Full Report'} →
                </a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center;">Montree · ${classroomName}</p>
            </div>
            `
            : `
            <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #059669;">🌳 ${locale === 'zh' ? `${firstName}的学习报告` : `${firstName}'s Weekly Update`}</h2>
              <p style="color: #666;">${classroomName} · ${weekDisplay}</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${reportLink}" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ${locale === 'zh' ? '查看完整报告' : 'View Full Report'} →
                </a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center;">Montree · ${classroomName}</p>
            </div>
            `;

          for (const email of parentEmails) {
            try {
              await resend.emails.send({
                from: 'Montree <noreply@montree.xyz>',
                to: email,
                subject: `🌳 ${locale === 'zh' ? `${firstName}的每周学习报告` : `${firstName}'s Weekly Update`}`,
                html,
              });
              emailsSent++;
            } catch (err) {
              console.error(`Email failed for ${email}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`Send failed for child ${draft.child_id}:`, err);
        errors.push({
          child_id: draft.child_id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      published,
      emails_sent: emailsSent,
      errors: errors.length > 0 ? errors : undefined,
      total_drafts: drafts.length,
    });
  } catch (error) {
    console.error('Weekly wrap send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
