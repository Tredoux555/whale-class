// lib/story/coach/email-verification.ts
//
// Shared email-verification helpers for public Lyf Coach accounts. Sending is
// always best-effort and NEVER throws — a mail outage can slow nothing and break
// nothing in the signup / resend paths.

import { randomBytes } from 'crypto';
import type { UntypedClient } from '@/lib/supabase-client';

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

// ── First-100 welcome bonus ─────────────────────────────────────────────────

/** Welcome-bonus cohort size: the first N VERIFIED public accounts. */
export const FIRST_N_WELCOME = 100;

/**
 * Count of VERIFIED public-web accounts. Called from /verify AFTER the row is
 * flipped email_verified=true, so the just-verified account is included. Only
 * public web signups ever run /verify, so email_verified=true IS the public
 * cohort — owner/family rows never verify. Returns +Infinity on ANY error so a
 * read failure can never wrongly grant the bonus.
 */
export async function countVerifiedPublicAccounts(supabase: UntypedClient): Promise<number> {
  const { count, error } = await supabase
    .from('story_admin_users')
    .select('space', { count: 'exact', head: true })
    .eq('email_verified', true);
  if (error) {
    console.warn('[lyf-coach] first-100 count error:', error.message);
    return Number.POSITIVE_INFINITY;
  }
  return count ?? Number.POSITIVE_INFINITY;
}

function welcomeHtml(): string {
  // Bright-emerald celebration card, white text. Body text is VERBATIM per spec —
  // do not edit the wording.
  return `
    <div style="background:#00a86b;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:36px 32px;border-radius:16px;max-width:520px;margin:0 auto">
      <h1 style="font-family:Georgia,serif;color:#ffffff;font-size:24px;margin:0 0 16px">You're one of the first.</h1>
      <p style="line-height:1.7;color:#ffffff;font-size:15px;margin:0">You're one of the first 100 people through the door. I built this alone, in Beijing, while teaching kindergarten by day. As a thank you &mdash; I've given you 1000 prompts this month instead of 500. Full depth, no limits. Use it well. Tell me what you think.</p>
      <p style="line-height:1.6;color:rgba(255,255,255,0.85);font-size:13px;margin:26px 0 0">&mdash; The Lyf Coach team</p>
    </div>`;
}

/**
 * Send the first-100 welcome email (verbatim copy). Best-effort; NEVER throws.
 * Sender resolves to hello@montree.xyz via verifyFrom().
 */
export async function sendCoachWelcomeFirst100Email(toEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[lyf-coach] RESEND_API_KEY missing — welcome email not sent to', toEmail);
    return;
  }
  const text =
    "You're one of the first 100 people through the door. I built this alone, in Beijing, while teaching kindergarten by day. As a thank you — I've given you 1000 prompts this month instead of 500. Full depth, no limits. Use it well. Tell me what you think.\n\n— The Lyf Coach team";
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: verifyFrom(),
      to: toEmail,
      subject: "You're one of the first.",
      html: welcomeHtml(),
      text,
    });
    if (error) console.error('[lyf-coach] welcome email send error:', error);
  } catch (e) {
    console.error('[lyf-coach] welcome email threw:', e);
  }
}

// ── New-signup operator ping ─────────────────────────────────────────────────

/** Where new-signup pings land. Defaults to the spec address; env-overridable. */
function signupNotifyTo(): string {
  return process.env.LYF_COACH_SIGNUP_NOTIFY_TO || 'hello@montree.xyz';
}

function signupNotifyHtml(opts: { username: string; when: string; founder: string }): string {
  return `
    <div style="background:#0a1a0f;color:#e8f0ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;border-radius:14px;max-width:480px;margin:0 auto">
      <h1 style="font-family:Georgia,serif;color:#fff;font-size:19px;margin:0 0 14px">New Lyf Coach signup</h1>
      <table style="border-collapse:collapse;font-size:14px;line-height:1.6">
        <tr><td style="color:#8fb3a0;padding:2px 14px 2px 0">Username</td><td style="color:#e8f0ea">${opts.username}</td></tr>
        <tr><td style="color:#8fb3a0;padding:2px 14px 2px 0">Time</td><td style="color:#e8f0ea">${opts.when}</td></tr>
        <tr><td style="color:#8fb3a0;padding:2px 14px 2px 0">Founder</td><td style="color:#e8f0ea">${opts.founder}</td></tr>
      </table>
      <p style="line-height:1.6;color:#8fb3a0;font-size:12px;margin-top:18px">&mdash; Lyf Coach signup ping</p>
    </div>`;
}

/**
 * Real-time operator ping when a new public Lyf Coach account signs up. Sent to
 * hello@montree.xyz (signupNotifyTo). Best-effort; logs and swallows every
 * failure — NEVER throws, NEVER blocks signup.
 *
 * Founder status is finalised at email verification (first 100 VERIFIED), so at
 * signup we report whether the founder window is still open. `founderWindowOpen`
 * is null when the verified count couldn't be read (reported as "unknown" — we
 * never falsely imply founder status on a read error).
 */
export async function sendSignupNotificationEmail(opts: {
  username: string;
  founderWindowOpen: boolean | null;
  verifiedCount: number | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[lyf-coach] RESEND_API_KEY missing — signup ping not sent for', opts.username);
    return;
  }
  const when = new Date().toISOString();
  const slots =
    opts.verifiedCount != null && Number.isFinite(opts.verifiedCount)
      ? ` (${opts.verifiedCount}/${FIRST_N_WELCOME} verified)`
      : '';
  const founder =
    opts.founderWindowOpen === null
      ? 'window status unknown'
      : opts.founderWindowOpen
        ? `in the founding ${FIRST_N_WELCOME} — window OPEN${slots}, confirmed when they verify their email`
        : `NOT in the founding ${FIRST_N_WELCOME} — cohort full`;

  const text =
    `New Lyf Coach signup\n\n` +
    `Username: ${opts.username}\n` +
    `Time: ${when}\n` +
    `Founder: ${founder}\n\n` +
    `— Lyf Coach signup ping`;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: verifyFrom(),
      to: signupNotifyTo(),
      subject: `New Lyf Coach signup — ${opts.username}`,
      html: signupNotifyHtml({ username: opts.username, when, founder }),
      text,
    });
    if (error) console.error('[lyf-coach] signup ping send error:', error);
  } catch (e) {
    console.error('[lyf-coach] signup ping threw:', e);
  }
}
