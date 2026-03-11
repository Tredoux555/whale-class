// /api/montree/weekly-review/[childId]/send/route.ts
// POST: Send the finalized parent report via email
// Body: { report_text: string, locale?: 'en' | 'zh' }

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { Resend } from 'resend';
import { getTranslator } from '@/lib/montree/i18n/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await params;

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const limited = await checkRateLimit(`send-report-${auth.userId}`, 50, 86400);
    if (limited) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { report_text, locale: reqLocale } = body;
    const locale = (['en', 'zh'].includes(reqLocale) ? reqLocale : 'en') as string;
    const t = getTranslator(locale);

    if (!report_text || typeof report_text !== 'string' || report_text.length > 10000) {
      return NextResponse.json({ error: 'report_text required (max 10000 chars)' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get child + classroom info
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    if (!child.classroom_id) {
      return NextResponse.json({ error: 'Child has no classroom' }, { status: 400 });
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('name, school_id')
      .eq('id', child.classroom_id)
      .maybeSingle();

    // Get linked parents
    const { data: links } = await supabase
      .from('montree_child_parent_links')
      .select('parent_email, relationship')
      .eq('child_id', childId)
      .eq('status', 'active');

    const parentEmails = (links?.map(l => l.parent_email).filter(Boolean) || [])
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    // Save report to DB
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const weekStartStr = monday.toISOString().split('T')[0];

    const sundayEnd = new Date(monday);
    sundayEnd.setDate(monday.getDate() + 6);
    const weekEndStr = sundayEnd.toISOString().split('T')[0];

    const reportYear = monday.getFullYear();
    const startOfYear = new Date(reportYear, 0, 1);
    const daysSinceStart = Math.floor((monday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

    await supabase
      .from('montree_weekly_reports')
      .upsert({
        school_id: classroom?.school_id || auth.schoolId,
        classroom_id: child.classroom_id,
        child_id: childId,
        week_number: weekNumber,
        report_year: reportYear,
        week_start: weekStartStr,
        week_end: weekEndStr,
        report_type: 'parent',
        status: 'sent',
        content: { narrative: report_text, generated_via: 'weekly_review' },
        is_published: true,
        published_at: now.toISOString(),
        generated_at: now.toISOString(),
        sent_at: now.toISOString(),
      }, { onConflict: 'child_id,week_number,report_year' });

    // Send emails
    let sent = 0;

    if (parentEmails.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Convert markdown-ish report to simple HTML
      const htmlBody = report_text
        .split('\n')
        .map(line => {
          if (line.startsWith('**') && line.endsWith('**')) {
            return `<h3 style="color: #059669; margin-top: 16px;">${line.replace(/\*\*/g, '')}</h3>`;
          }
          if (line.startsWith('# ')) {
            return `<h2 style="color: #059669;">${line.slice(2)}</h2>`;
          }
          if (line.startsWith('## ')) {
            return `<h3 style="color: #059669; margin-top: 16px;">${line.slice(3)}</h3>`;
          }
          if (line.trim() === '') return '<br/>';
          return `<p style="color: #333; line-height: 1.6; margin: 4px 0;">${line}</p>`;
        })
        .join('');

      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin: 0;">🌳 ${t('weeklyReview.emailSubject' as any, 'Weekly Update for {name}').replace('{name}', child.name)}</h2>
            <p style="color: #666; margin: 4px 0;">${classroom?.name || ''} · ${weekStartStr} – ${weekEndStr}</p>
          </div>
          ${htmlBody}
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Sent via Montree · montree.xyz</p>
        </div>
      `;

      for (const email of parentEmails) {
        try {
          await resend.emails.send({
            from: 'Montree <noreply@montree.xyz>',
            to: email,
            subject: `🌳 ${t('weeklyReview.emailSubject' as any, 'Weekly Update for {name}').replace('{name}', child.name)}`,
            html,
          });
          sent++;
        } catch (err) {
          console.error('Failed to send weekly report email:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      parent_count: parentEmails.length,
      saved: true,
    });

  } catch (error) {
    console.error('Send weekly report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
