// lib/story/coach/email-verification.ts
//
// Shared email-verification helpers for public Lyf Coach accounts. Sending is
// always best-effort and NEVER throws — a mail outage can slow nothing and break
// nothing in the signup / resend paths.

import { randomBytes } from 'crypto';

export const VERIFY_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // links valid 7 days

export function generateVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

// "Lyf Coach <hello@montree.xyz>" if LYF_COACH_FROM_EMAIL is set; else the
// service-wide RESEND_FROM_EMAIL (already "Montree <hello@montree.xyz>" on prod);
// else a safe default. All resolve to the verified montree.xyz domain.
function verifyFrom(): string {
  return (
    process.env.LYF_COACH_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'Lyf Coach <hello@montree.xyz>'
  );
}

function verifyHtml(link: string): string {
  return `
    <div style="background:#0a1a0f;color:#e8f0ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px;margin:0 auto">
      <h1 style="font-family:Georgia,serif;color:#fff;font-size:23px;margin:0 0 12px">Confirm your email</h1>
      <p style="line-height:1.6;color:#cfe3d6">You&rsquo;re already in &mdash; this just confirms your email so we can keep your account secure and help you get back in if you&rsquo;re ever locked out.</p>
      <p style="margin:26px 0">
        <a href="${link}" style="background:#34d399;color:#06140c;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:10px;display:inline-block">Confirm my email</a>
      </p>
      <p style="line-height:1.6;color:#8fb3a0;font-size:13px">If you didn&rsquo;t create a Lyf Coach account, you can ignore this email.</p>
      <p style="line-height:1.6;color:#8fb3a0;font-size:13px">&mdash; The Lyf Coach team</p>
    </div>`;
}

function verifyText(link: string): string {
  return `Confirm your email\n\nYou're already in — this just confirms your email so we can keep your account secure.\n\nConfirm: ${link}\n\nIf you didn't create a Lyf Coach account, ignore this email.\n— The Lyf Coach team`;
}

/** Send the confirmation email. Best-effort; logs and swallows every failure. */
export async function sendCoachVerificationEmail(toEmail: string, token: string): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';
  const link = `${appUrl}/api/lyf-coach/verify?token=${encodeURIComponent(token)}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[lyf-coach] RESEND_API_KEY missing — verification email not sent. Link:', link);
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: verifyFrom(),
      to: toEmail,
      subject: 'Confirm your email — Lyf Coach',
      html: verifyHtml(link),
      text: verifyText(link),
    });
    if (error) console.error('[lyf-coach] verification email send error:', error);
  } catch (e) {
    console.error('[lyf-coach] verification email threw:', e);
  }
}
