// app/api/montree/cron/engagement/route.ts
// Build D (friction pass, Jul 17 2026) — ONE hourly engagement cron.
//
// Designed to be hit HOURLY by a single cron-job.org job:
//   POST https://montree.xyz/api/montree/cron/engagement
//   header: x-cron-secret: <CRON_SECRET>
//
// Runs D1 (trial-lifecycle emails) then D3 (Friday report-ready push) in
// sequence and returns counts-only JSON. Every step is try/caught so one
// school's failure never aborts the run. Batch caps: ≤50 emails, ≤100 pushes.
//
// 🚨 FAIL-CLOSED AUTH: this route sends outbound email + push. It requires
// x-cron-secret to EXACTLY match process.env.CRON_SECRET. A missing env or a
// missing/wrong header → 401. No super-admin fallback (unlike the billing
// crons) — nothing here should ever run from a browser session.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  isValidTimezone,
  tzOffsetMs,
  currentWeekdayInTz,
  currentWeekStartInTz,
  localDateInTzToUtcInstant,
} from '@/lib/montree/school-time';
import { sendPushToOwners, type PushOwner } from '@/lib/montree/push/sender';

export const maxDuration = 120;

const MAX_EMAILS_PER_RUN = 50;
const MAX_PUSHES_PER_RUN = 100;

type LifecycleType = 'trial_d5' | 'trial_expired' | 'winback_d14';

// 🚨 Fable-authored copy — VERBATIM per the contract. Subject is always
// "Montree". Plain text, no selling, bare montree.xyz link, Tredoux's voice.
const EMAIL_COPY: Record<LifecycleType, string> = {
  trial_d5:
    "Hi,\n\nJust a heads-up — your school's Premium trial ends in about two days.\n\nNothing breaks and nothing is deleted. Your classroom, photos and records all stay exactly as they are. When you're ready, you choose a plan in Settings → Billing: Starter at $3 or Premium at $7 per student.\n\nIf you're unsure which fits your school, reply to this email — I read everything myself.\n\nKind regards,\nTredoux\nmontree.xyz",
  trial_expired:
    "Hi,\n\nYour school's trial has ended. Everything you built is safe — your classroom, photos and records are all waiting exactly where you left them.\n\nTo keep the reports and AI flowing, pick a plan in Settings → Billing. It takes about two minutes.\n\nIf price is the obstacle, reply and tell me — we have a Foundation program for schools that need it.\n\nKind regards,\nTredoux\nmontree.xyz",
  winback_d14:
    "Hi,\n\nA week or two ago your Montree trial ended. If it wasn't right for your classroom, no hard feelings at all.\n\nBut if life simply got busy — your classroom is still there, exactly as you left it, and picking a plan takes two minutes.\n\nEither way, I'd genuinely value one line of reply telling me what would have made it a yes.\n\nKind regards,\nTredoux\nmontree.xyz",
};

interface SchoolRow {
  id: string;
  owner_email: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  locked_at: string | null;
  founding_member: boolean | null;
  billing_override_usd: number | null;
  timezone: string | null;
  signup_timezone: string | null;
}

function resolveTz(row: { timezone: string | null; signup_timezone: string | null }): string {
  const tz = (row.timezone || row.signup_timezone || 'UTC').trim() || 'UTC';
  return isValidTimezone(tz) ? tz : 'UTC';
}

export async function POST(request: NextRequest) {
  // ── Fail-closed auth (guards outbound email/push) ────────────────────────
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const counts = {
    emails: { trial_d5: 0, trial_expired: 0, winback_d14: 0, skipped_no_email: 0, failed: 0 },
    pushes: { schools_notified: 0, sent: 0 },
  };

  // ── D1. Trial-lifecycle emails ───────────────────────────────────────────
  try {
    await runLifecycleEmails(supabase, counts);
  } catch (err) {
    console.error('[cron/engagement] D1 lifecycle emails failed:', err);
  }

  // ── D3. Friday report-ready push ─────────────────────────────────────────
  try {
    await runFridayNudges(supabase, counts);
  } catch (err) {
    console.error('[cron/engagement] D3 friday nudges failed:', err);
  }

  return NextResponse.json({ ok: true, ...counts });
}

// ─────────────────────────────────────────────────────────────────────────
// D1 — trial lifecycle emails
// ─────────────────────────────────────────────────────────────────────────
async function runLifecycleEmails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- service-role client is untyped app-wide (matches isFeatureEnabled).
  supabase: any,
  counts: { emails: { trial_d5: number; trial_expired: number; winback_d14: number; skipped_no_email: number; failed: number } }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[cron/engagement] RESEND_API_KEY unset — skipping lifecycle emails');
    return;
  }
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Montree <noreply@montree.xyz>';
  const resend = new Resend(apiKey);

  const now = Date.now();
  // Broad fetch: any trialing school whose trial ends within the union of all
  // three windows (NOW-14d .. NOW+2d). Bucketing + send-once ledger + hourly
  // cron make the exact edges forgiving.
  const lowerMs = now - 14 * 24 * 60 * 60 * 1000;
  const upperMs = now + 2 * 24 * 60 * 60 * 1000;

  const { data: schools, error } = await supabase
    .from('montree_schools')
    .select(
      'id, owner_email, subscription_status, trial_ends_at, locked_at, founding_member, billing_override_usd'
    )
    .eq('subscription_status', 'trialing')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', new Date(lowerMs).toISOString())
    .lte('trial_ends_at', new Date(upperMs).toISOString());

  if (error) {
    console.error('[cron/engagement] lifecycle school query failed:', error);
    return;
  }

  let emailsSent = 0;

  for (const s of (schools || []) as SchoolRow[]) {
    if (emailsSent >= MAX_EMAILS_PER_RUN) break;
    try {
      // Exclusions: locked, founding, billing override, comped/converted flags.
      if (s.locked_at) continue;
      if (s.founding_member === true) continue;
      if (s.billing_override_usd !== null && s.billing_override_usd !== undefined) continue;
      if (!s.trial_ends_at) continue;

      const trialEndMs = new Date(s.trial_ends_at).getTime();
      if (Number.isNaN(trialEndMs)) continue;

      // Which window? (each edge is a half-open day band around trial_ends_at)
      let type: LifecycleType | null = null;
      if (trialEndMs > now + 1 * 24 * 60 * 60 * 1000 && trialEndMs <= now + 2 * 24 * 60 * 60 * 1000) {
        type = 'trial_d5'; // ~2 days left
      } else if (trialEndMs > now - 3 * 24 * 60 * 60 * 1000 && trialEndMs <= now) {
        type = 'trial_expired';
      } else if (trialEndMs > now - 14 * 24 * 60 * 60 * 1000 && trialEndMs <= now - 7 * 24 * 60 * 60 * 1000) {
        type = 'winback_d14';
      }
      if (!type) continue;

      // Already converted/comped via tier flags? (reuse the shared helper).
      const [sonnet, haiku] = await Promise.all([
        isFeatureEnabled(supabase, s.id, 'ai_tier_sonnet'),
        isFeatureEnabled(supabase, s.id, 'ai_tier_haiku'),
      ]);
      if (sonnet || haiku) continue;

      // Send-once ledger check.
      const { data: already } = await supabase
        .from('montree_lifecycle_emails')
        .select('id')
        .eq('school_id', s.id)
        .eq('email_type', type)
        .maybeSingle();
      if (already) continue;

      // Resolve recipient — owner_email is NOT NULL on montree_schools, so this
      // almost always resolves; the principal-email fallback covers legacy rows.
      const to = await resolveSchoolContactEmail(supabase, s);
      if (!to) {
        counts.emails.skipped_no_email++;
        continue;
      }

      await resend.emails.send({
        from: fromEmail,
        to,
        subject: 'Montree',
        text: EMAIL_COPY[type],
      });

      // Record in the ledger ON SUCCESS only.
      await supabase
        .from('montree_lifecycle_emails')
        .insert({ school_id: s.id, email_type: type });

      counts.emails[type]++;
      emailsSent++;
    } catch (err) {
      counts.emails.failed++;
      console.error(`[cron/engagement] lifecycle email failed for school ${s.id}:`, err);
    }
  }
}

/**
 * Contact email for lifecycle mail: the school's owner_email (NOT NULL on
 * montree_schools). Falls back to the principal's email in montree_school_admins
 * for legacy rows that somehow lack one.
 */
async function resolveSchoolContactEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client.
  supabase: any,
  s: SchoolRow
): Promise<string | null> {
  if (s.owner_email && s.owner_email.includes('@')) return s.owner_email;
  try {
    const { data: admin } = await supabase
      .from('montree_school_admins')
      .select('email')
      .eq('school_id', s.id)
      .not('email', 'is', null)
      .limit(1)
      .maybeSingle();
    const email = (admin as { email?: string | null } | null)?.email;
    if (email && email.includes('@')) return email;
  } catch {
    // fall through
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// D3 — Friday report-ready push
// ─────────────────────────────────────────────────────────────────────────
async function runFridayNudges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client.
  supabase: any,
  counts: { pushes: { schools_notified: number; sent: number } }
): Promise<void> {
  // Locked schools are excluded — their teachers are bounced to /montree/locked,
  // so the deep link would be a broken promise (audit WARN-1).
  const { data: schools, error } = await supabase
    .from('montree_schools')
    .select('id, timezone, signup_timezone')
    .is('locked_at', null);
  if (error) {
    console.error('[cron/engagement] friday-nudge school query failed:', error);
    return;
  }

  const now = new Date();
  let pushesSent = 0;

  for (const raw of (schools || []) as Array<{ id: string; timezone: string | null; signup_timezone: string | null }>) {
    if (pushesSent >= MAX_PUSHES_PER_RUN) break;
    try {
      const tz = resolveTz(raw);

      // Fire window: Friday 14:00–16:59 school-local.
      if (currentWeekdayInTz(tz, now) !== 'friday') continue;
      const localHour = new Date(now.getTime() + tzOffsetMs(tz, now)).getUTCHours();
      if (localHour < 14 || localHour > 16) continue;

      const weekStart = currentWeekStartInTz(tz, now); // school-local Monday, YYYY-MM-DD

      // Send-once (week-keyed) ledger check.
      const { data: already } = await supabase
        .from('montree_push_nudges')
        .select('id')
        .eq('school_id', raw.id)
        .eq('nudge_type', 'weekly_report')
        .eq('week_start', weekStart)
        .maybeSingle();
      if (already) continue;

      // ≥1 media captured this school-week? (cheap head count, limit 1)
      const weekStartInstant = localDateInTzToUtcInstant(weekStart, tz).toISOString();
      const { count: mediaCount } = await supabase
        .from('montree_media')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', raw.id)
        .gte('captured_at', weekStartInstant);
      if (!mediaCount || mediaCount < 1) continue;

      // Active teacher owners of the school.
      const { data: teachers } = await supabase
        .from('montree_teachers')
        .select('id')
        .eq('school_id', raw.id)
        .eq('is_active', true);
      const owners: PushOwner[] = ((teachers || []) as Array<{ id: string }>)
        .filter((t) => !!t.id)
        .map((t) => ({ type: 'teacher' as const, id: t.id }));
      if (!owners.length) continue;

      // Push copy hardcoded English this round (push i18n is a wider effort —
      // deferred). Deep link to the Parents tab.
      const result = await sendPushToOwners(supabase, owners, {
        title: 'Montree',
        body: "This week's photos are ready to become parent reports.",
        data: { url: '/montree/dashboard/parent-codes', type: 'weekly_report_nudge' },
      });

      // Record ON SUCCESS — i.e. when at least one device was actually reached.
      // `skipped` = push not configured; `sent === 0` = configured but no teacher
      // has a registered device yet (common pre-app-adoption). Neither burns the
      // week's send-once slot, so the nudge retries next hourly run / after a
      // teacher installs the app (audit WARN-2).
      if (!result.skipped && result.sent > 0) {
        await supabase
          .from('montree_push_nudges')
          .insert({ school_id: raw.id, nudge_type: 'weekly_report', week_start: weekStart });
        counts.pushes.schools_notified++;
        counts.pushes.sent += result.sent;
        pushesSent += Math.max(1, result.sent);
      }
    } catch (err) {
      console.error(`[cron/engagement] friday nudge failed for school ${raw.id}:`, err);
    }
  }
}
