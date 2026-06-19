// app/api/story/admin/account/route.ts
//
// Permanent account deletion for a Sanctuary / Lyf Coach space.
// App Store Guideline 5.1.1(v): an account-based app MUST let the user delete
// their account AND its server-side data from inside the app.
//
// Scope: everything is keyed off the VERIFIED token (username + space), never
// the client body — one space can only ever delete itself. The account row is
// removed by username; the personal content is removed by space. Best-effort
// per content table so a missing table/column can't abort the deletion; the
// account-row delete is the authoritative success signal.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';

export const dynamic = 'force-dynamic';

// Tables holding a single sanctuary's OWN personal content, scoped by `space`.
// (Deliberately excludes shared/social tables — messages, board, calls — which
// involve other people.)
const SPACE_SCOPED_PERSONAL_TABLES = [
  'story_diary_entries',
  'story_projects',
  'story_plan_events',
  'story_plan_days',
  'story_coach_memory',
  'story_coach_log',
  'story_coach_consolidation',
  'story_admin_login_logs',
  'story_push_subscriptions',
] as const;

export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization');

  const admin = await verifyAdminToken(auth);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const wiped: Record<string, number | string> = {};

  // 1) Wipe the space's personal content. Best-effort per table — a missing
  //    table/column must not abort the account deletion.
  for (const table of SPACE_SCOPED_PERSONAL_TABLES) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('space', space);
      wiped[table] = error ? `skipped: ${error.message}` : (count ?? 0);
    } catch (e) {
      wiped[table] = `skipped: ${e instanceof Error ? e.message : 'error'}`;
    }
  }

  // 2) Delete the account row itself (by the verified username). After this the
  //    account no longer exists server-side — the 5.1.1(v) requirement.
  const { error: userErr } = await supabase
    .from('story_admin_users')
    .delete()
    .eq('username', admin);

  if (userErr) {
    console.error('[account] delete failed for', admin, '-', userErr.message);
    return NextResponse.json(
      { error: 'Could not delete your account. Please try again.' },
      { status: 500 },
    );
  }

  console.info(`[account] permanently deleted "${admin}" (space ${space}); content:`, wiped);
  return NextResponse.json({ ok: true, deleted_account: admin, content: wiped });
}
