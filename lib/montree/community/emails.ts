// lib/montree/community/emails.ts
// Transactional email for the Teachers' Room (confirm address / reset password).
//
// Mirrors lib/montree/email.ts's posture rather than importing from it: lazy
// Resend client created at runtime (never at module load, so a build without
// RESEND_API_KEY can't fail), same getFromEmail() fallback, same
// {success,error} result shape. Kept separate so the community's copy can
// never disturb the parent/report email paths.
//
// Both links land back on the SATPIN page itself — there is no separate
// account area to send anyone to. The page reads the query param on mount,
// acts on it, then strips it out of the URL.

import { Resend } from 'resend';

let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const getFromEmail = () =>
  process.env.RESEND_FROM_EMAIL || 'Montree <onboarding@resend.dev>';

const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';

const ROOM_PATH = '/montree/library/satpin';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// TEMPLATE
// ============================================

// Email clients are not browsers: table-free but inline-styled, light
// background, no web fonts, no CSS variables. The forest green shows up as
// accents only so it still reads as Montree without fighting dark-mode
// clients that invert backgrounds.
function shell(opts: {
  heading: string;
  intro: string;
  buttonLabel: string;
  buttonUrl: string;
  footnote: string;
}): string {
  const { heading, intro, buttonLabel, buttonUrl, footnote } = opts;
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#ffffff;border:1px solid #e3e8e4;border-radius:14px;padding:32px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7c8a80;margin-bottom:14px;">
          Montree &middot; Teachers&rsquo; Room
        </div>
        <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#123024;font-weight:600;">
          ${heading}
        </h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44544b;">
          ${intro}
        </p>
        <a href="${buttonUrl}"
           style="display:inline-block;background:#1d5c41;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;">
          ${buttonLabel}
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7c8a80;">
          ${footnote}
        </p>
        <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9aa79f;word-break:break-all;">
          If the button doesn&rsquo;t work, paste this into your browser:<br />
          ${buttonUrl}
        </p>
      </div>
      <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#9aa79f;">
        montree.xyz
      </p>
    </div>
  </body>
</html>`;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<EmailResult> {
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('[community/emails] send error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, messageId: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[community/emails] send exception:', err);
    return { success: false, error: message };
  }
}

// ============================================
// CONFIRM ADDRESS
// ============================================

export async function sendCommunityConfirmEmail(
  to: string,
  displayName: string,
  token: string
): Promise<EmailResult> {
  const url = `${getBaseUrl()}${ROOM_PATH}?tr_confirm=${encodeURIComponent(token)}`;
  const name = displayName || 'there';

  const html = shell({
    heading: 'Confirm your email',
    intro: `Hello ${escapeHtml(name)} &mdash; one step and you&rsquo;re in. Confirm this address and you can leave messages in the Teachers&rsquo; Room and share materials with other teachers.`,
    buttonLabel: 'Confirm my email',
    buttonUrl: url,
    footnote:
      'If you didn&rsquo;t create a Montree Teachers&rsquo; Room account, you can ignore this email &mdash; nothing was set up.',
  });

  const text = [
    `Hello ${name},`,
    '',
    'Confirm your email address to join the Montree Teachers’ Room:',
    url,
    '',
    'If you didn’t create an account, you can ignore this email.',
    '',
    'montree.xyz',
  ].join('\n');

  return send(to, 'Confirm your Montree Teachers’ Room account', html, text);
}

// ============================================
// PASSWORD RESET
// ============================================

export async function sendCommunityResetEmail(
  to: string,
  displayName: string,
  token: string
): Promise<EmailResult> {
  const url = `${getBaseUrl()}${ROOM_PATH}?tr_reset=${encodeURIComponent(token)}`;
  const name = displayName || 'there';

  const html = shell({
    heading: 'Set a new password',
    intro: `Hello ${escapeHtml(name)} &mdash; use the link below to choose a new password for the Teachers&rsquo; Room. It stays valid for one hour.`,
    buttonLabel: 'Choose a new password',
    buttonUrl: url,
    footnote:
      'If you didn&rsquo;t ask for this, you can ignore this email &mdash; your password hasn&rsquo;t changed.',
  });

  const text = [
    `Hello ${name},`,
    '',
    'Choose a new password for the Montree Teachers’ Room (valid for one hour):',
    url,
    '',
    'If you didn’t ask for this, ignore this email — your password hasn’t changed.',
    '',
    'montree.xyz',
  ].join('\n');

  return send(to, 'Reset your Montree Teachers’ Room password', html, text);
}

/** Display names are user-supplied and land inside HTML — escape them. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
