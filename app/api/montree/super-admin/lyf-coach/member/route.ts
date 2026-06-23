// app/api/montree/super-admin/lyf-coach/member/route.ts
//
// Super-admin — Lyf Coach MEMBER MANAGEMENT (the operator's "full control").
//   PATCH  → cancel the member's subscription (Stripe cancel + status='canceled'),
//            the account + their data stay intact.
//   DELETE → scrub the member entirely: cancel any live Stripe subscription, purge
//            EVERY space-keyed personal row (Coach log/memory, diary, planner,
//            projects, sanctuary/context/family rows) AND every username-keyed
//            legacy-Story trace (visits, sessions, login logs, secret_stories,
//            vault), then remove the story_admin_users account row.
//
// Super-admin auth required (verifySuperAdminAuth — x-super-admin-token / password).
//
// 🔒 OWNER GUARD: the owner's own sanctuary space ('tredoux') is REFUSED here.
//    Deleting/cancelling it would wipe the Vault + the owner's personal platform
//    and lock the owner out. Everything else (public subscribers, family spaces)
//    is fully operable from this endpoint.
//
// Resilient by design: the purge attempts each table independently and tolerates
// "table/column does not exist" (42P01 / 42703) so schema drift never 500s the
// scrub. ONLY the final account-row delete is treated as fatal.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getCoachBillingConfig, getCoachStripe, loadCoachUserBilling } from '@/lib/story/coach/billing';

export const dynamic = 'force-dynamic';

// The owner's own sanctuary space — never deletable/cancellable from here.
const OWNER_PROTECTED = new Set(['tredoux']);

// PostgREST: 42P01 = relation absent, 42703 = column absent. Either means
// "nothing to purge in this table for this member" → skip cleanly.
function isSkippable(code: string | undefined): boolean {
  return code === '42P01' || code === '42703';
}

async function cancelStripeSubscription(
  subscriptionId: string | null,
): Promise<{ cancelled: boolean; reason?: string }> {
  if (!subscriptionId) return { cancelled: false, reason: 'no subscription' };
  const cfg = getCoachBillingConfig();
  if (!cfg.configured) return { cancelled: false, reason: 'stripe not configured' };
  try {
    const stripe = getCoachStripe();
    await stripe.subscriptions.cancel(subscriptionId);
    return { cancelled: true };
  } catch (err: unknown) {
    // Already-cancelled / unknown subscriptions must NOT block the DB write.
    const msg = err instanceof Error ? err.message : 'stripe cancel failed';
    console.warn('[lyf-coach member] stripe cancel:', msg);
    return { cancelled: false, reason: msg };
  }
}

// ── PATCH: cancel subscription, keep the account ─────────────────────────────
export async function PATCH(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { space?: string } | null;
  const space = body?.space?.trim();
  if (!space) return NextResponse.json({ error: 'space required' }, { status: 400 });
  if (OWNER_PROTECTED.has(space)) {
    return NextResponse.json({ error: 'The owner space cannot be cancelled here.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const billing = await loadCoachUserBilling(supabase, space).catch(() => null);
  const stripe = await cancelStripeSubscription(billing?.subscription_id ?? null);

  const { error } = await supabase
    .from('story_admin_users')
    .update({ subscription_status: 'canceled' })
    .eq('space', space);
  if (error && !isSkippable(error.code)) {
    console.error('[lyf-coach member] cancel update failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, space, stripe_cancelled: stripe.cancelled, stripe_reason: stripe.reason });
}

// ── DELETE: scrub the member entirely ────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { space?: string } | null;
  const space = body?.space?.trim();
  if (!space) return NextResponse.json({ error: 'space required' }, { status: 400 });
  if (OWNER_PROTECTED.has(space)) {
    return NextResponse.json({ error: 'The owner space cannot be deleted here.' }, { status: 403 });
  }

  const supabase = getSupabase();

  // Resolve the account's username (legacy-Story trace tables key by username,
  // not space). Narrow select — never depends on the migration-269 columns.
  let username: string | null = null;
  try {
    const { data } = await supabase.from('story_admin_users').select('username').eq('space', space).limit(1);
    username = ((data?.[0] as { username?: string } | undefined)?.username) ?? null;
  } catch {
    username = null;
  }

  // Cancel any live Stripe subscription so billing stops before the row is gone.
  const billing = await loadCoachUserBilling(supabase, space).catch(() => null);
  const stripe = await cancelStripeSubscription(billing?.subscription_id ?? null);

  const purged: string[] = [];
  const skipped: Array<{ target: string; reason: string }> = [];

  async function purge(table: string, column: string, value: string) {
    const { error } = await supabase.from(table).delete().eq(column, value);
    if (error) skipped.push({ target: `${table}.${column}`, reason: isSkippable(error.code) ? (error.code || 'skip') : error.message });
    else purged.push(`${table}.${column}`);
  }
  async function purgeIn(table: string, column: string, values: string[]) {
    if (values.length === 0) return;
    const { error } = await supabase.from(table).delete().in(column, values);
    if (error) skipped.push({ target: `${table}.${column}`, reason: isSkippable(error.code) ? (error.code || 'skip') : error.message });
    else purged.push(`${table}.${column}`);
  }

  // 1. Space-keyed personal data (the Coach + Sanctuary content for this space).
  const spaceTargets: Array<[string, string]> = [
    ['story_coach_memory', 'space'],
    ['story_coach_log', 'space'],
    ['story_coach_consolidation', 'space'],
    ['story_diary_entries', 'space'],
    ['story_projects', 'space'],
    ['story_plan_days', 'space'],
    ['story_plan_events', 'space'],
    ['story_messages_secret', 'space'],
    ['story_sanctuary_messages', 'space'],
    ['story_coach_usage', 'space'],
    ['story_coach_context_links', 'author_space'],
    ['story_coach_context_links', 'target_space'],
    ['story_coach_context_notes', 'author_space'],
    ['story_coach_context_notes', 'target_space'],
    ['story_coach_family_signals', 'source_space'],
    ['story_coach_family_nudges', 'target_space'],
    ['story_coach_family_brain_log', 'queried_by_space'],
  ];
  for (const [table, column] of spaceTargets) await purge(table, column, space);

  // 2. Username-keyed legacy-Story trace. Match the username AND the space label
  //    (covers either logging convention) so no trace survives.
  const ids = Array.from(new Set([username, space].filter(Boolean))) as string[];
  const userTargets: Array<[string, string]> = [
    ['story_users', 'username'],
    ['story_visits', 'username'],
    ['story_online_sessions', 'username'],
    ['story_login_logs', 'username'],
    ['story_admin_login_logs', 'username'],
    ['secret_stories', 'message_author'],
    ['vault_files', 'uploaded_by'],
    ['vault_audit_log', 'admin_username'],
  ];
  for (const [table, column] of userTargets) await purgeIn(table, column, ids);

  // 3. The account row itself — this one MUST succeed.
  const { error: acctErr } = await supabase.from('story_admin_users').delete().eq('space', space);
  if (acctErr) {
    console.error('[lyf-coach member] account delete failed:', acctErr.message);
    return NextResponse.json({ error: `Account delete failed: ${acctErr.message}`, purged, skipped }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    space,
    username,
    stripe_cancelled: stripe.cancelled,
    purged_count: purged.length,
    purged,
    skipped,
  });
}
