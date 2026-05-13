// /api/montree/become-an-agent/apply
//
// Phase 3 of the agent system fix plan — public application endpoint for
// prospective agents. Mirrors the /api/montree/demo-request pattern: write
// to montree_outreach_contacts, log to montree_outreach_log, fire an
// auto-ack email + a Tredoux notification.
//
// Schema mapping (per migration 203):
//   contact_type = 'agent_application'
//   status       = 'agent_applied'    (super-admin reviews → 'sent' on accept,
//                                       'declined' on decline)
//   contact_person = applicant full name
//   org_name       = current school / affiliation (or "Independent")
//   email          = applicant email
//   country        = country
//   application_details JSONB = { current_role, why_good_fit }
//
// Anti-spam:
//   - Honeypot field `website_url_hp` MUST be empty (real users can't see it)
//   - 500-char cap on free-text fields
//   - Email format validation
//
// Auto-ack tone:
//   - Warm, Tredoux-voice, brief
//   - Sets expectation: review within a few days
//   - No code attached (Tredoux issues manually post-review)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const MAX_FIELD_LEN = 500;
const NAME_MAX = 120;
const EMAIL_MAX = 200;

function clip(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function isValidEmail(s: string): boolean {
  // Light validation — Resend / Stripe will catch the rest.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeFn(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      country,
      affiliation,    // current school / company / org (optional)
      current_role,   // free-text: "Lead teacher at Greenfield" / "Independent consultant"
      why_good_fit,   // free-text: their pitch
      website_url_hp, // HONEYPOT — must be empty
    } = body || {};

    // Honeypot check — bots fill this; real users can't see it.
    if (typeof website_url_hp === 'string' && website_url_hp.trim().length > 0) {
      // Silently 200 to confuse bots. No DB write.
      return NextResponse.json({ success: true });
    }

    const cleanName = clip(name, NAME_MAX);
    const cleanEmail = clip(email, EMAIL_MAX)?.toLowerCase() || null;
    const cleanCountry = clip(country, 80);
    const cleanAffiliation = clip(affiliation, NAME_MAX);
    const cleanRole = clip(current_role, MAX_FIELD_LEN);
    const cleanPitch = clip(why_good_fit, MAX_FIELD_LEN);

    if (!cleanName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!cleanPitch) {
      return NextResponse.json({ error: 'Tell us a bit about yourself' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Build the row payload once — used by INSERT and the resubmit UPDATE path.
    const applicationPayload = {
      org_name: cleanAffiliation || 'Independent',
      contact_person: cleanName,
      email: cleanEmail,
      country: cleanCountry,
      contact_type: 'agent_application',
      status: 'agent_applied',
      priority: 'warm',
      source: 'become_an_agent_form',
      notes: cleanPitch,
      application_details: {
        current_role: cleanRole,
        why_good_fit: cleanPitch,
      },
    };

    // INSERT cleanly. We deliberately do NOT do an upsert-on-email here.
    // The unique constraint on montree_outreach_contacts(email) blocks duplicates,
    // and we handle the 23505 case explicitly:
    //   - If existing row IS an agent_application → it's a legitimate resubmit,
    //     update with the new pitch (newest wins).
    //   - If existing row is a different contact_type (demo_request, individual_school,
    //     etc.) → those are different conversations. Return a friendly 409 so the
    //     applicant uses a different email or contacts Tredoux directly. We never
    //     silently mutate one row type into another — that loses CRM history.
    const { error: insertErr } = await supabase
      .from('montree_outreach_contacts')
      .insert(applicationPayload);

    if (insertErr) {
      const pgCode = (insertErr as { code?: string }).code;
      if (pgCode === '23505') {
        // Email already exists — figure out which kind of row it is.
        const { data: existing } = await supabase
          .from('montree_outreach_contacts')
          .select('id, contact_type, status')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!existing) {
          // Unique violation but no visible row? Race condition or RLS oddity.
          console.error('[become-an-agent/apply] 23505 but no existing row visible — race?');
          return NextResponse.json(
            { error: 'Could not record application', detail: insertErr.message },
            { status: 500 }
          );
        }

        if ((existing as { contact_type: string }).contact_type === 'agent_application') {
          // Legitimate resubmit by the same applicant. Update with the new pitch.
          const { error: updateErr } = await supabase
            .from('montree_outreach_contacts')
            .update({
              ...applicationPayload,
              // Reset status to 'agent_applied' in case it was previously declined —
              // the applicant is trying again, give them a fresh review.
              status: 'agent_applied',
              updated_at: new Date().toISOString(),
            })
            .eq('id', (existing as { id: string }).id);

          if (updateErr) {
            console.error('[become-an-agent/apply] resubmit update failed:', updateErr.message);
            return NextResponse.json(
              { error: 'Could not update existing application', detail: updateErr.message },
              { status: 500 }
            );
          }
          // Fall through — auto-ack + log still fire below.
        } else {
          // Email is on a different row type. Don't silently mutate.
          return NextResponse.json(
            {
              error:
                'This email is already on file with us. Please use a different email address, or reach out to tredoux555@gmail.com directly.',
            },
            { status: 409 }
          );
        }
      } else {
        console.error('[become-an-agent/apply] insert failed:', insertErr.message);
        return NextResponse.json(
          { error: 'Could not record application', detail: insertErr.message },
          { status: 500 }
        );
      }
    }

    // Log the event (best-effort — fire and forget)
    void supabase
      .from('montree_outreach_log')
      .insert({
        action: 'agent_application_received',
        details: {
          name: cleanName,
          email: cleanEmail,
          country: cleanCountry,
          affiliation: cleanAffiliation,
          source: 'become_an_agent_form',
        },
      })
      .then(({ error }) => {
        if (error) console.error('[become-an-agent/apply] log insert failed:', error.message);
      });

    // Auto-ack + Tredoux notification — fire and forget so the user gets a
    // fast response even if Resend is slow / unconfigured.
    void sendAutoAck(cleanName, cleanEmail, cleanAffiliation, cleanCountry, cleanRole, cleanPitch);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[become-an-agent/apply] unexpected:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

async function sendAutoAck(
  name: string,
  email: string,
  affiliation: string | null,
  country: string | null,
  role: string | null,
  pitch: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    console.warn('[become-an-agent/apply] Resend not configured — skipping email');
    return;
  }

  const firstName = name.split(/\s+/)[0] || 'there';

  // Notify Tredoux first — this one matters for triage.
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: 'tredoux555@gmail.com',
        subject: `🌱 Agent application: ${name}${affiliation ? ` (${affiliation})` : ''}`,
        text: [
          `New agent application from montree.xyz/become-an-agent`,
          ``,
          `Name:        ${name}`,
          `Email:       ${email}`,
          `Country:     ${country || 'Not provided'}`,
          `Affiliation: ${affiliation || 'Independent'}`,
          `Role:        ${role || 'Not provided'}`,
          ``,
          `Why a good fit:`,
          pitch,
          ``,
          `Review in super-admin → Agent Applications banner.`,
          ``,
          `Time: ${new Date().toISOString()}`,
        ].join('\n'),
      }),
    });
  } catch (err) {
    console.error('[become-an-agent/apply] Tredoux notification failed:', err);
  }

  // Applicant auto-ack — warm, short, sets the timing expectation.
  try {
    const confirmHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:520px;margin:32px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 12px;font-size:22px;font-family:Lora,Georgia,serif;font-weight:700;">Montree</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">Dear ${escapeFn(firstName)},</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">Thanks for your interest in becoming a Montree agent. I read every application personally.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 14px;color:#1f2d24;">You'll hear back from me within a few days. If we're a good fit, I'll send you your agent code and walk you through getting set up.</p>
    <p style="font-size:14px;line-height:1.55;margin:24px 0 0;color:#5b6b73;">Kind regards,<br/>Tredoux<br/><a href="https://montree.xyz" style="color:#10b981;">montree.xyz</a></p>
  </div>
</body></html>`;
    const confirmText =
      `Dear ${firstName},\n\n` +
      `Thanks for your interest in becoming a Montree agent. I read every application personally.\n\n` +
      `You'll hear back from me within a few days. If we're a good fit, I'll send you your agent code and walk you through getting set up.\n\n` +
      `Kind regards,\nTredoux\nmontree.xyz`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'Montree — thanks for applying',
        html: confirmHtml,
        text: confirmText,
      }),
    });
  } catch (err) {
    console.error('[become-an-agent/apply] auto-ack email failed:', err);
  }
}
