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

      // Confirmation to requester
      const firstName = name ? name.split(' ')[0] : null;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: email.trim().toLowerCase(),
          subject: 'Montree',
          text: `Dear ${firstName || school || 'there'},\n\nThank you for reaching out. I'll be in touch within 24 hours to arrange a time to show you what Montree can do.\n\nKind regards,\nTredoux\nmontree.xyz`,
        }),
      }).catch(err => console.error('[demo-request] Failed to send confirmation email:', err));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
