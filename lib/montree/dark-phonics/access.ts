// lib/montree/dark-phonics/access.ts
//
// THE SWITCH. Everything the hub does about money funnels through this file, so
// turning the gate on is an env var and turning it off is the same env var.
//
//   DARK_PHONICS_PAYWALL = 'off' (default, and anything that is not 'on')
//     → every visitor is `full`. No locks are drawn, no prices are shown, the
//       checkout route is never reachable from the UI.
//   DARK_PHONICS_PAYWALL = 'on'
//     → a visitor with an ACTIVE row in montree_dp_subscriptions (keyed on
//       their Teachers' Room / community user id) is `full`; everyone else is
//       `free`, which is lessons 1–3 and their classroom items.
//
// 🚨 THE FREE LIST IS DATA, NOT A RULE SCATTERED ROUND THE UI. Every lock badge,
// every classroom pill and every deep link asks canPlayLesson(); nothing else
// is allowed to decide.
//
// The pure half of this module (DP_FREE_LESSONS, isPaywallOn, canPlayLesson,
// accessFor) imports nothing, so the tests exercise the real rules. Only
// getDarkPhonicsAccess() touches a request and the database.

import type { NextRequest } from 'next/server';

/** Free forever, flag on or off. Three books is enough to fall in love. */
export const DP_FREE_LESSONS: readonly number[] = Object.freeze([1, 2, 3]);

export type DpTier = 'free' | 'full';

export type DpAccessReason =
  | 'flag_off'
  | 'subscribed'
  | 'no_session'
  | 'no_subscription'
  | 'lookup_failed';

export interface DpAccess {
  tier: DpTier;
  reason: DpAccessReason;
  /** The community user id behind a `subscribed`/`no_subscription` answer. */
  userId?: string | null;
}

/** Subscription statuses Stripe reports that still mean "they may play". */
export const DP_ACTIVE_STATUSES: readonly string[] = Object.freeze(['active', 'trialing', 'past_due']);

/** Is the gate switched on at all? Anything but the literal 'on' means no. */
export function isPaywallOn(env: Record<string, string | undefined> = process.env): boolean {
  return (env.DARK_PHONICS_PAYWALL ?? '').trim().toLowerCase() === 'on';
}

/** The whole lock rule, in one pure line. */
export function canPlayLesson(lesson: number, tier: DpTier, paywallOn: boolean): boolean {
  if (!paywallOn) return true;
  if (tier === 'full') return true;
  return DP_FREE_LESSONS.includes(lesson);
}

/** Should the UI draw a lock badge on this lesson's card? */
export function isLessonLocked(lesson: number, tier: DpTier, paywallOn: boolean): boolean {
  return !canPlayLesson(lesson, tier, paywallOn);
}

/** Build an access object from already-known facts. Pure; the tests use this. */
export function accessFor(opts: {
  paywallOn: boolean;
  userId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: string | null;
  now?: Date;
}): DpAccess {
  if (!opts.paywallOn) return { tier: 'full', reason: 'flag_off', userId: opts.userId ?? null };
  if (!opts.userId) return { tier: 'free', reason: 'no_session', userId: null };

  const status = (opts.subscriptionStatus ?? '').trim().toLowerCase();
  if (!status || !DP_ACTIVE_STATUSES.includes(status)) {
    return { tier: 'free', reason: 'no_subscription', userId: opts.userId };
  }

  // A row can be `active` and stale if a webhook was missed — the period end is
  // the second opinion, and it is only ever allowed to take access AWAY.
  if (opts.currentPeriodEnd) {
    const end = Date.parse(opts.currentPeriodEnd);
    const now = (opts.now ?? new Date()).getTime();
    if (Number.isFinite(end) && end < now) {
      return { tier: 'free', reason: 'no_subscription', userId: opts.userId };
    }
  }

  return { tier: 'full', reason: 'subscribed', userId: opts.userId };
}

/**
 * The live answer for one request.
 *
 * 🚨 FAILS OPEN. If the flag is on and the subscription table is unreachable
 * (or migration 360 has not been run), this returns `full`, not `free`: an
 * outage must never lock a paying teacher out mid-lesson, and the worst case is
 * that a free visitor gets a few minutes of everything.
 */
export async function getDarkPhonicsAccess(request: NextRequest): Promise<DpAccess> {
  if (!isPaywallOn()) return { tier: 'full', reason: 'flag_off', userId: null };

  try {
    const { getCommunityUser } = await import('@/lib/montree/community/auth');
    const user = await getCommunityUser(request);
    if (!user) return { tier: 'free', reason: 'no_session', userId: null };

    const { getSupabase } = await import('@/lib/supabase-client');
    const { data, error } = await getSupabase()
      .from('montree_dp_subscriptions')
      .select('status, current_period_end')
      .eq('community_user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[dp/access] subscription lookup failed; failing OPEN:', error.message);
      return { tier: 'full', reason: 'lookup_failed', userId: user.id };
    }

    return accessFor({
      paywallOn: true,
      userId: user.id,
      subscriptionStatus: (data?.status as string | undefined) ?? null,
      currentPeriodEnd: (data?.current_period_end as string | undefined) ?? null,
    });
  } catch (err) {
    console.error('[dp/access] threw; failing OPEN:', err);
    return { tier: 'full', reason: 'lookup_failed', userId: null };
  }
}

/** Copy for the lock, in both languages, kept next to the rule it explains. */
export const DP_UNLOCK_COPY = {
  en: 'Unlock everything — $5/month or $30/year',
  zh: '解锁全部内容 — 每月 $5 或每年 $30',
} as const;
