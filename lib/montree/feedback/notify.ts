// lib/montree/feedback/notify.ts
//
// Closing the loop. Subscribers hear about an official reply, a status change
// and an accepted answer — one quiet email each, never more.
//
// ── The mailer decision ─────────────────────────────────────────────────────
// This repo already sends mail with Resend (lib/montree/email.ts, RESEND_API_KEY
// + RESEND_FROM_EMAIL). We use the same service and the same envelope
// variables, but NOT that module's functions: every sender there is a
// hand-written Montree template for a school audience. So this file keeps its
// own small Mailer interface with three implementations:
//
//   resendMailer  — the real one, used when RESEND_API_KEY is set.
//   consoleMailer — logs and returns success, used in dev and in tests.
//   noopMailer    — for a product that mounts the board and wants no email.
//
// Another product mounting this module swaps one function (setMailer) and
// nothing else changes.
//
// ── Never block the request ─────────────────────────────────────────────────
// A parent tapping "Post it" must never wait on an SMTP handshake. Every
// notification is written to montree_fb_outbox first (a fast insert), and then
// a fire-and-forget drain runs in the same process. If that drain fails, or
// the lambda is killed mid-flight, the row is still there and
// /api/montree/cron/feedback-outbox picks it up on the next run. Nothing is
// lost and nothing is sent twice: `sent_at` is the latch.

import type { Board, Post, PostStatus } from './types';
import { statusLabel } from './statuses';
import { enqueueOutbox, markOutboxFailed, markOutboxSent, subscriberEmails, takeOutbox } from './repo';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  readonly name: string;
  send(message: MailMessage): Promise<{ ok: boolean; error?: string }>;
}

export const consoleMailer: Mailer = {
  name: 'console',
  async send(message) {
    console.log(`[feedback/notify] (console mailer) -> ${message.to}: ${message.subject}`);
    return { ok: true };
  },
};

export const noopMailer: Mailer = {
  name: 'noop',
  async send() {
    return { ok: true };
  },
};

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || 'Montree <onboarding@resend.dev>';
}

export const resendMailer: Mailer = {
  name: 'resend',
  async send(message) {
    try {
      // Imported lazily so a deployment without RESEND_API_KEY never pays for
      // the module, and so this file stays importable in a unit test.
      const { Resend } = await import('resend');
      const client = new Resend(process.env.RESEND_API_KEY);
      const res = await client.emails.send({
        from: fromAddress(),
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      if ((res as { error?: unknown }).error) {
        return { ok: false, error: String((res as { error?: unknown }).error) };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

let override: Mailer | null = null;

/** Mount-time hook: a host product can supply its own mailer. */
export function setMailer(mailer: Mailer | null): void {
  override = mailer;
}

export function getMailer(): Mailer {
  if (override) return override;
  if (process.env.FEEDBACK_MAILER === 'none') return noopMailer;
  if (process.env.RESEND_API_KEY) return resendMailer;
  return consoleMailer;
}

// ── Templates ───────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function postUrl(post: Post): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://montree.xyz';
  return `${base}/montree/library/feedback/${post.id}`;
}

function shell(title: string, bodyHtml: string, link: string): string {
  // Inline styles only, and the module's own palette — the same warm ground and
  // single accent the board uses, so the email looks like where it came from.
  return `<!doctype html><html><body style="margin:0;background:#faf8f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#23211c;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;">
  <div style="font-size:13px;color:#6b6559;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px;">Montree feedback</div>
  <h1 style="margin:0 0 14px;font-size:20px;line-height:1.35;font-weight:700;">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <p style="margin:22px 0 0;"><a href="${link}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#3f6b00;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">Read the post</a></p>
  <p style="margin:26px 0 0;font-size:12px;color:#8a8375;line-height:1.5;">You are getting this because you posted, voted or commented on it. Open the post and choose Following to stop.</p>
</div></body></html>`;
}

export type NotifyKind = 'official_reply' | 'status_change' | 'answered' | 'comment';

interface Built {
  subject: string;
  text: string;
  html: string;
}

function buildOfficialReply(post: Post, authorName: string, body: string): Built {
  const link = postUrl(post);
  const excerpt = body.length > 400 ? `${body.slice(0, 400)}…` : body;
  return {
    subject: `The team replied: ${post.title}`,
    text: `${authorName} from the Montree team replied to "${post.title}":\n\n${excerpt}\n\n${link}`,
    html: shell(
      post.title,
      `<p style="margin:0 0 10px;font-size:15px;color:#5b564c;">${escapeHtml(authorName)} replied for the Montree team.</p>
       <div style="background:#f2f6ea;border:1px solid #c2d3a6;border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(excerpt)}</div>`,
      link,
    ),
  };
}

function buildStatusChange(post: Post, from: PostStatus, to: PostStatus, note: string | null): Built {
  const link = postUrl(post);
  const toLabel = statusLabel(to, 'en');
  const fromLabel = statusLabel(from, 'en');
  return {
    subject: `${toLabel}: ${post.title}`,
    text:
      `"${post.title}" moved from ${fromLabel} to ${toLabel}.` +
      (note ? `\n\n${note}` : '') +
      `\n\n${link}`,
    html: shell(
      post.title,
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Moved from <strong>${escapeHtml(fromLabel)}</strong> to <strong>${escapeHtml(toLabel)}</strong>.</p>` +
        (note
          ? `<div style="background:#ffffff;border:1px solid #e6e0d5;border-radius:12px;padding:14px 16px;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(note)}</div>`
          : ''),
      link,
    ),
  };
}

function buildAnswered(post: Post, body: string): Built {
  const link = postUrl(post);
  const excerpt = body.length > 400 ? `${body.slice(0, 400)}…` : body;
  return {
    subject: `Answered: ${post.title}`,
    text: `"${post.title}" has an accepted answer:\n\n${excerpt}\n\n${link}`,
    html: shell(
      post.title,
      `<p style="margin:0 0 10px;font-size:15px;color:#5b564c;">This question now has an accepted answer.</p>
       <div style="background:#f2f6ea;border:1px solid #c2d3a6;border-radius:12px;padding:16px 18px;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(excerpt)}</div>`,
      link,
    ),
  };
}

// ── The public API ──────────────────────────────────────────────────────────

interface NotifyArgs {
  board: Board;
  post: Post;
  kind: NotifyKind;
  /** The person who caused it — they never get their own email. */
  actorKey: string | null;
  authorName?: string;
  body?: string;
  fromStatus?: PostStatus;
  toStatus?: PostStatus;
  note?: string | null;
}

/**
 * Queue a notification for every live subscriber except the actor, then try to
 * deliver immediately. NEVER throws and never awaits delivery on the caller's
 * critical path — call it without `await` from a route, or with one and accept
 * only the cheap enqueue cost.
 */
export async function notifySubscribers(args: NotifyArgs): Promise<void> {
  try {
    const recipients = await subscriberEmails(args.post.id, args.actorKey);
    if (!recipients.length) return;

    let built: Built;
    if (args.kind === 'official_reply') {
      built = buildOfficialReply(args.post, args.authorName || 'The team', args.body || '');
    } else if (args.kind === 'answered') {
      built = buildAnswered(args.post, args.body || '');
    } else if (args.kind === 'status_change' && args.toStatus) {
      built = buildStatusChange(args.post, args.fromStatus ?? 'open', args.toStatus, args.note ?? null);
    } else {
      return; // plain comments do not mail; the board is not a mailing list
    }

    await enqueueOutbox(
      args.board.id,
      args.post.id,
      args.kind,
      recipients.map((r) => ({
        toEmail: r.email,
        subject: built.subject,
        payload: { text: built.text, html: built.html },
      })),
    );

    // Fire-and-forget. The outbox row is already durable, so a failure here is
    // a delay, not a loss.
    void drainOutbox(recipients.length).catch(() => undefined);
  } catch (err) {
    console.error('[feedback/notify] enqueue failed (request unaffected)', err);
  }
}

/**
 * Send pending outbox rows. Called opportunistically after a write and on a
 * schedule by /api/montree/cron/feedback-outbox. Returns what it did.
 */
export async function drainOutbox(limit = 40): Promise<{ sent: number; failed: number }> {
  const mailer = getMailer();
  const rows = await takeOutbox(limit);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const payload = row.payload as { text?: string; html?: string };
    const result = await mailer.send({
      to: row.toEmail,
      subject: row.subject,
      text: payload.text || row.subject,
      html: payload.html || `<p>${escapeHtml(row.subject)}</p>`,
    });
    if (result.ok) {
      await markOutboxSent(row.id);
      sent += 1;
    } else {
      await markOutboxFailed(row.id, row.attempts, result.error || 'unknown');
      failed += 1;
    }
  }
  return { sent, failed };
}
