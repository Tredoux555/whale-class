import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const { name, school, email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Save to outreach contacts
    await supabase.from('montree_outreach_contacts').upsert(
      {
        org_name: school || 'Unknown School',
        contact_person: name || null,
        email: email.trim().toLowerCase(),
        contact_type: 'individual_school',
        status: 'demo_requested',
        priority: 'warm',
        source: 'landing_page',
        notes: `Demo requested via landing page. Name: ${name || 'N/A'}. School: ${school || 'N/A'}.`,
      },
      { onConflict: 'email', ignoreDuplicates: false }
    );

    // Log the request (contact_email not a column — use details JSONB)
    await supabase.from('montree_outreach_log').insert({
      action: 'demo_requested',
      details: { email: email.trim().toLowerCase(), name, school, source: 'landing_page', timestamp: new Date().toISOString() },
    });

    // Send notification email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (resendKey && fromEmail) {
      // Notify Tredoux
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: 'tredoux555@gmail.com',
          subject: `🎯 Demo Request: ${school || email}`,
          text: `New demo request from montree.xyz!\n\nName: ${name || 'Not provided'}\nSchool: ${school || 'Not provided'}\nEmail: ${email}\n\nTime: ${new Date().toISOString()}`,
        }),
      }).catch(err => console.error('[demo-request] Failed to send notification email:', err));

      // Confirmation to requester — HTML + plain text fallback. The plain
      // text version preserved verbatim for clients that can't render HTML.
      const firstName = name ? name.split(' ')[0] : null;
      const greetingName = firstName || school || 'there';
      const escapeFn = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const confirmHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:520px;margin:32px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 12px;font-size:22px;font-family:Lora,Georgia,serif;font-weight:700;">Montree</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">Dear ${escapeFn(greetingName)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">Thank you for reaching out. I'll be in touch within 24 hours to arrange a time to show you what Montree can do.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">In the meantime, you can have a quick look at <a href="https://montree.xyz" style="color:#10b981;font-weight:600;text-decoration:none;">montree.xyz</a> — or simply reply to this email if you have a particular question.</p>
    <p style="font-size:14px;line-height:1.55;margin:24px 0 0;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
      const confirmText = `Dear ${greetingName},\n\nThank you for reaching out. I'll be in touch within 24 hours to arrange a time to show you what Montree can do.\n\nIn the meantime, you can have a quick look at montree.xyz — or simply reply to this email if you have a particular question.\n\nKind regards,\nTredoux\nmontree.xyz`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: email.trim().toLowerCase(),
          subject: 'Montree — thanks for reaching out',
          html: confirmHtml,
          text: confirmText,
        }),
      }).catch(err => console.error('[demo-request] Failed to send confirmation email:', err));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
