// app/api/montree/parent/account/notification-prefs/route.ts
// Tier 2 push polish (Jun 2026): per-parent push notification preferences.
//
// GET   → { prefs: { reports, messages, broadcasts } } resolved against the
//         opt-out default (absent key = true). migration_pending=true when
//         migration 255 hasn't been run yet.
// PATCH { reports?, messages?, broadcasts? } (booleans) → merge + save.
//
// Auth: resolveAuthorizedParent (JWT cookie + DB re-check) — same contract
// as the other parent routes. Full-account sessions only: invite-based
// sessions have no montree_parents row (and can't register push devices in
// the first place — see push/register/route.ts), so there is nothing to set.
//
// Enforcement happens in ONE place: sendPushToOwners()
// (lib/montree/push/sender.ts) filters parent owners by these prefs.

import { NextRequest, NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';

// notification_prefs (migration 255) isn't in the generated DB types yet —
// untyped client view, same contract as push/sender.ts and push/register.
const db = (): SupabaseClient => getSupabase() as unknown as SupabaseClient;

const CATEGORIES = ['reports', 'messages', 'broadcasts'] as const;
type Category = (typeof CATEGORIES)[number];

/** Opt-out model: absent key = enabled; only explicit false disables. */
function resolvePrefs(raw: Record<string, unknown> | null | undefined): Record<Category, boolean> {
  return {
    reports: raw?.reports !== false,
    messages: raw?.messages !== false,
    broadcasts: raw?.broadcasts !== false,
  };
}

function isMigrationPending(error: { code?: string } | null): boolean {
  // 42703 = column missing, 42P01 = table missing.
  return error?.code === '42703' || error?.code === '42P01';
}

export async function GET() {
  try {
    const supabase = db();
    const parent = await resolveAuthorizedParent(supabase);
    if (!parent) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!parent.parentId) {
      // Invite-based session — no parent account row, no devices, no prefs.
      return NextResponse.json(
        { error: 'Notification preferences require a full parent account' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('montree_parents')
      .select('notification_prefs')
      .eq('id', parent.parentId)
      .maybeSingle();

    if (error) {
      if (isMigrationPending(error as { code?: string })) {
        // Migration 255 not run — report defaults, flag so the UI can say why
        // saving is unavailable.
        return NextResponse.json({ prefs: resolvePrefs(null), migration_pending: true });
      }
      console.error('[notification-prefs GET] lookup failed:', error.message);
      return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
    }

    return NextResponse.json({
      prefs: resolvePrefs((data as { notification_prefs?: Record<string, unknown> } | null)?.notification_prefs),
    });
  } catch (e) {
    console.error('[notification-prefs GET] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = db();
    const parent = await resolveAuthorizedParent(supabase);
    if (!parent) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!parent.parentId) {
      return NextResponse.json(
        { error: 'Notification preferences require a full parent account' },
        { status: 403 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const changes: Partial<Record<Category, boolean>> = {};
    for (const key of CATEGORIES) {
      if (typeof body[key] === 'boolean') changes[key] = body[key] as boolean;
    }
    if (!Object.keys(changes).length) {
      return NextResponse.json(
        { error: 'Provide at least one of reports/messages/broadcasts as a boolean' },
        { status: 400 }
      );
    }

    // Read-merge-write so unknown future keys in the jsonb are preserved.
    const { data: current, error: readError } = await supabase
      .from('montree_parents')
      .select('notification_prefs')
      .eq('id', parent.parentId)
      .maybeSingle();
    if (readError) {
      if (isMigrationPending(readError as { code?: string })) {
        return NextResponse.json(
          {
            error: 'Notification preferences are not available yet',
            migration_pending: true,
          },
          { status: 503 }
        );
      }
      console.error('[notification-prefs PATCH] read failed:', readError.message);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    const merged = {
      ...(((current as { notification_prefs?: Record<string, unknown> } | null)?.notification_prefs) || {}),
      ...changes,
    };

    const { error: writeError } = await supabase
      .from('montree_parents')
      .update({ notification_prefs: merged })
      .eq('id', parent.parentId);
    if (writeError) {
      console.error('[notification-prefs PATCH] update failed:', writeError.message);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, prefs: resolvePrefs(merged) });
  } catch (e) {
    console.error('[notification-prefs PATCH] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
