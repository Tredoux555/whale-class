// app/api/story/cron/send-reminders/route.ts
//
// Dispatches due coach reminders: a push to the user's device (story_coach_push_
// subscriptions) — or an email fallback when no push landed. Recurring reminders
// reschedule their next occurrence. This is the ONLY cross-space reader in the
// reminders feature and it NEVER returns any reminder content to the caller —
// only counts.
//
// Schedule via an external cron (cron-job.org), every 5 minutes:
//   POST 'https://montree.xyz/api/story/cron/send-reminders'
//     -H "x-cron-secret: $CRON_SECRET"
// Add ?dry_run=1 to count what's due without sending or mutating anything.
//
// Auth: x-cron-secret (fail-closed vs CRON_SECRET) OR a Story admin Bearer token
// (so it can be hand-triggered from a dashboard). Reuses the expire-media posture.
//
// Double-fire guard: each due row is CLAIMED with a conditional
// UPDATE … SET status='sent' … WHERE id=… AND status='pending' before sending, so
// overlapping invocations can never double-send. A row is marked sent regardless
// of delivery outcome (delivered_via records what actually happened) — a broken
// endpoint is never re-spammed.
//
// PRIVACY NOTE: the push body IS the user's own reminder text. Push payloads
// transit Apple/Google push services under standard Web Push encryption in
// transit; this matches the platform's at-rest posture and is acceptable.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/story-db';
import { verifyStoryAdminToken } from '@/lib/story/story-admin-auth';
import { readDiaryField, encryptDiaryField } from '@/lib/story/diary-crypto';
import { sendCoachPush } from '@/lib/story/push';
import { nextFutureOccurrence, type Recurrence } from '@/lib/story/coach/reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RECURRENCES = new Set<Recurrence>(['daily', 'weekdays', 'weekly', 'monthly']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COACH_URL = '/lyf-coach/coach';

interface DueRow {
  id: string;
  space: string;
  message_enc: string;
  cipher_version: number | null;
  tz: string | null;
  recurrence: string | null;
  remind_at: string;
}

async function handle(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let authed = false;
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (cronSecret && expected && cronSecret === expected) authed = true;
  if (!authed) {
    const admin = await verifyStoryAdminToken(req.headers.get('authorization'));
    if (admin) authed = true;
  }
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  // ── Select what's due ───────────────────────────────────────────────────────
  const { data: due, error } = await supabase
    .from('story_coach_reminders')
    .select('id, space, message_enc, cipher_version, tz, recurrence, remind_at')
    .eq('status', 'pending')
    .lte('remind_at', nowIso)
    .order('remind_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[cron send-reminders] due query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const dueRows = (due as DueRow[] | null) ?? [];

  if (dryRun) {
    return NextResponse.json({ ok: true, dry_run: true, due: dueRows.length, pushed: 0, emailed: 0, undelivered: 0 });
  }

  let pushed = 0;
  let emailed = 0;
  let undelivered = 0;
  let rescheduled = 0;

  for (const r of dueRows) {
    // Claim the row — check-and-act. If another invocation already took it, the
    // conditional UPDATE returns nothing and we skip (no double-send).
    const { data: claimed, error: claimErr } = await supabase
      .from('story_coach_reminders')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', r.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (claimErr) {
      console.warn('[cron send-reminders] claim failed:', claimErr.message);
      continue;
    }
    if (!claimed) continue; // lost the race — someone else is handling it

    let message = '';
    try {
      message = readDiaryField(r.message_enc, r.cipher_version) || '';
    } catch {
      message = '';
    }

    // Deliver: push first, email fallback when nothing landed.
    let deliveredVia: 'push' | 'email' | 'none' = 'none';
    try {
      const pushRes = await sendCoachPush(r.space, {
        title: 'Lyf Coach',
        body: message || 'A reminder from your coach.',
        url: COACH_URL,
      });
      if (pushRes.sent > 0) {
        deliveredVia = 'push';
        pushed += 1;
      } else {
        const ok = await sendReminderEmail(supabase, r.space, message);
        if (ok) { deliveredVia = 'email'; emailed += 1; }
        else { deliveredVia = 'none'; undelivered += 1; }
      }
    } catch (e) {
      console.warn('[cron send-reminders] delivery error:', e instanceof Error ? e.message : 'unknown');
      undelivered += 1;
    }

    // Record how it went (best-effort; the row is already marked sent).
    const { error: upErr } = await supabase
      .from('story_coach_reminders')
      .update({ delivered_via: deliveredVia })
      .eq('id', r.id);
    if (upErr) console.warn('[cron send-reminders] delivered_via update skipped:', upErr.message);

    // Recurring → schedule the next occurrence (in the reminder's tz), skipping
    // any that already passed so it fires once, not in a backlog storm.
    const recurrence = r.recurrence && RECURRENCES.has(r.recurrence as Recurrence) ? (r.recurrence as Recurrence) : null;
    if (recurrence) {
      try {
        const next = nextFutureOccurrence(new Date(r.remind_at), recurrence, r.tz || undefined, new Date());
        if (next) {
          const { error: insErr } = await supabase.from('story_coach_reminders').insert({
            space: r.space,
            remind_at: next.toISOString(),
            tz: r.tz,
            message_enc: message ? encryptDiaryField(message) : r.message_enc,
            recurrence,
            status: 'pending',
            cipher_version: 1,
          });
          if (insErr) console.warn('[cron send-reminders] reschedule insert skipped:', insErr.message);
          else rescheduled += 1;
        }
      } catch (e) {
        console.warn('[cron send-reminders] reschedule error:', e instanceof Error ? e.message : 'unknown');
      }
    }
  }

  return NextResponse.json({ ok: true, due: dueRows.length, pushed, emailed, undelivered, rescheduled });
}

/**
 * Email fallback. Public Lyf Coach accounts store the email AS the username
 * (there is no separate email column — see billing.ts). We only email a space
 * whose username looks like an email AND is email_verified. Best-effort.
 */
async function sendReminderEmail(
  supabase: ReturnType<typeof getSupabase>,
  space: string,
  message: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { data: acct } = await supabase
      .from('story_admin_users')
      .select('username, email_verified')
      .eq('space', space)
      .maybeSingle();
    const username = (acct?.username as string | undefined) || '';
    if (!acct || acct.email_verified !== true || !EMAIL_RE.test(username)) return false;

    const from = process.env.LYF_COACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Lyf Coach <hello@montree.xyz>';
    const body = message || 'A reminder from your coach.';
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: username,
      subject: 'A reminder from your coach',
      text: `${body}\n\nOpen your coach: https://montree.xyz${COACH_URL}\n\n— Lyf Coach`,
      html:
        `<div style="background:#0a1a0f;color:#e8f0ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:28px;border-radius:16px;max-width:520px;margin:0 auto">` +
        `<p style="line-height:1.6;color:#cfe3d6;font-size:16px;margin:0 0 20px">${escapeHtml(body)}</p>` +
        `<p style="margin:0"><a href="https://montree.xyz${COACH_URL}" style="background:#34d399;color:#06140c;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block">Open your coach</a></p>` +
        `<p style="line-height:1.6;color:#8fb3a0;font-size:13px;margin:22px 0 0">— Lyf Coach</p></div>`,
    });
    if (error) {
      console.warn('[cron send-reminders] email send error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[cron send-reminders] email threw:', e instanceof Error ? e.message : 'unknown');
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
