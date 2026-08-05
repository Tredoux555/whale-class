import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

// POST /api/montree/tryit/message
//
// The "Try Montree" gate form. Self-serve signup is closed, so this is now the
// front door: every new school starts as one of these rows plus an email in
// Tredoux's inbox.
//
// Abuse posture copied verbatim from /api/montree/demo-request (Session 113 V2
// audit): DB-backed rate limit per IP, hard length caps on every field, and
// the notification email is fire-and-forget so a Resend outage can't 500 a
// legitimate submission that already landed in the database.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MIN = 15;

const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320; // RFC 5321 max
const MAX_ORG_LEN = 200;
const MAX_MESSAGE_LEN = 4000;

/** Trim + coerce an unknown JSON field to a string. */
function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Escape user text before it goes anywhere near an HTML email body. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const ip = getClientIP(req.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/tryit/message', RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MIN
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const organisation = str(body.organisation);
    const message = str(body.message);

    // Every field is required — a submission missing the organisation or the
    // body isn't a lead worth a reply, it's noise.
    if (!name || !email || !organisation || !message) {
      return NextResponse.json(
        { error: 'Name, email, organisation and message are all required' },
        { status: 400 }
      );
    }

    // Deliberately loose: matches the demo-request posture (has an @, has a
    // dot after it, no whitespace). Stricter regexes reject real addresses.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    if (
      name.length > MAX_NAME_LEN ||
      email.length > MAX_EMAIL_LEN ||
      organisation.length > MAX_ORG_LEN ||
      message.length > MAX_MESSAGE_LEN
    ) {
      return NextResponse.json({ error: 'Input exceeds maximum length' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent')?.slice(0, 1024) || null;

    const { error } = await supabase.from('montree_tryit_messages').insert({
      name,
      email,
      organisation,
      message,
      ip: ip?.slice(0, 45) || null,
      user_agent: userAgent,
      status: 'new',
    });

    if (error) {
      // 42P01 = undefined_table → migration 316 hasn't run. Tell the operator
      // in the logs, tell the visitor nothing useful, and still 500 so the
      // form shows its error state rather than a false "thanks".
      console.error('[tryit/message] insert failed:', error.code, error.message);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }

    // Notification email — fire-and-forget, exactly like demo-request. The row
    // is already saved; a Resend failure must not fail the request.
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (resendKey && fromEmail) {
      const textBody =
        `New Try-It request from montree.xyz\n\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Organisation: ${organisation}\n\n` +
        `Message:\n${message}\n\n` +
        `Time: ${new Date().toISOString()}`;
      const htmlBody = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0a1a0f;">
  <div style="max-width:560px;margin:32px auto;padding:28px;background:#fff;border-radius:14px;border:1px solid rgba(52,211,153,0.18);">
    <h1 style="margin:0 0 14px;font-size:20px;font-family:Lora,Georgia,serif;font-weight:700;">New Try-It request</h1>
    <p style="font-size:14px;line-height:1.7;margin:0 0 14px;color:#1f2d24;">
      <strong>Name:</strong> ${esc(name)}<br/>
      <strong>Email:</strong> <a href="mailto:${esc(email)}" style="color:#10b981;">${esc(email)}</a><br/>
      <strong>Organisation:</strong> ${esc(organisation)}
    </p>
    <p style="font-size:14px;line-height:1.7;margin:0;color:#1f2d24;white-space:pre-wrap;">${esc(message)}</p>
    <p style="font-size:12px;line-height:1.55;margin:22px 0 0;color:#5b6b73;">montree.xyz · ${new Date().toISOString()}</p>
  </div>
</body></html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: 'tredoux555@gmail.com',
          reply_to: email,
          subject: `Montree: new Try-It request from ${name} (${organisation})`,
          html: htmlBody,
          text: textBody,
        }),
      }).catch(err => console.error('[tryit/message] Failed to send notification email:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tryit/message POST] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
