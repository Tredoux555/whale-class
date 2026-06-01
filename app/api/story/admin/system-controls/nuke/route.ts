import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase-client';
import { verifyAdminToken } from '@/lib/story-db';

export const maxDuration = 120;

// ============================================================================
// STORY "NUKE" — total destruction of ALL Story data.
//
// Wipes all Story CONTENT while leaving the system usable. Unlike
// `factory_reset` (which preserved audit logs but never touched secret_stories
// or the storage buckets), this destroys:
//   • Every Story CONTENT table — secret_stories (the hidden messages
//     themselves), message history, files, vault entries, and all logs.
//   • Every object in all three Story storage buckets (story-uploads,
//     story-files, vault-secure) — recursively, including orphans not
//     referenced by any DB row.
// It deliberately PRESERVES the accounts (story_users + story_admin_users) so
// after a nuke everyone can still log in and the app keeps working — there is
// just nothing left inside it.
//
// GATE: requires the dedicated secret `STORY_NUKE_CODE` (env var, timing-safe
// compare, fail-closed if unset) + the literal confirm phrase. It works WITH or
// WITHOUT an admin session, so the operator can still nuke even if an attacker
// has locked them out of the dashboard — the secret code is the authority.
//
// 🚨 HONEST LIMITS (do not oversell this):
//   1. If an attacker has ALREADY copied the database / storage (server
//      seizure, a Supabase snapshot, a DB backup), nuking the live data does
//      nothing — they hold a copy. The nuke denies FUTURE access; it cannot
//      un-exfiltrate.
//   2. Supabase keeps its own backups / point-in-time-recovery for a retention
//      window. Deleting live rows does NOT purge those provider-side backups.
//      To be truly gone, the operator must also handle Supabase backup
//      retention out-of-band.
//   3. This is destruction, not confidentiality. Real protection of content is
//      end-to-end encryption (see docs/STORY_E2E_MARATHON_PLAN.md).
// ============================================================================

const CONFIRM_PHRASE = 'NUKE EVERYTHING';

// CONTENT tables wiped by the nuke — every message, media record, file, vault
// entry, and log. The accounts that keep the system usable are deliberately
// PRESERVED: story_users (the two logins) and story_admin_users (the admin
// login) are NOT in this list, so after a nuke everyone can still log in and
// the app keeps working — there's just nothing left in it.
const STORY_TABLES = [
  'secret_stories',          // the current hidden message(s)
  'story_message_history',   // all messages + media records
  'story_message_reads',     // read receipts
  'story_shared_files',      // shared-file records
  'story_calls',             // call signalling rows
  'story_push_subscriptions',// notification endpoints
  'story_online_sessions',   // presence state
  'story_login_logs',        // user login history
  'story_admin_login_logs',  // admin login history
  'story_visits',            // visit tracking
  'vault_files',             // vault file records
  'vault_audit_log',         // vault access log
  'vault_unlock_attempts',   // vault unlock attempts
];

// Story-dedicated storage buckets — these hold ONLY Story data, so we empty
// them from the root.
const STORY_BUCKETS = ['story-uploads', 'story-files', 'vault-secure'];

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Compare against self to keep the operation constant-time-ish, then fail.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

type Supa = ReturnType<typeof getSupabase>;

// Delete every row from a table without guessing the primary-key name.
// Tries a sequence of always-true filters: id → created_at → username
// (covers every Story table shape). Advances to the next filter ONLY when the
// failure is a missing-column error, so we never delete twice.
async function wipeTable(supabase: Supa, table: string): Promise<number | string> {
  const filters: Array<(q: ReturnType<ReturnType<Supa['from']>['delete']>) => ReturnType<ReturnType<Supa['from']>['delete']>> = [
    (q) => q.not('id', 'is', null),
    (q) => q.gte('created_at', '1970-01-01'),
    (q) => q.not('username', 'is', null),
  ];
  let lastErr = '';
  for (const applyFilter of filters) {
    const { error, count } = await applyFilter(supabase.from(table).delete({ count: 'exact' }));
    if (!error) return count ?? 0;
    lastErr = error.message;
    // Try the next filter only if THIS one referenced a column that doesn't
    // exist. Any other error (permissions, network) is terminal.
    if (!/column .* does not exist|42703/i.test(error.message)) break;
  }
  return `ERROR: ${lastErr}`;
}

// Recursively collect every object path under a prefix, then remove in chunks.
async function emptyBucket(supabase: Supa, bucket: string): Promise<number | string> {
  try {
    const allPaths: string[] = [];

    async function walk(prefix: string, depth: number): Promise<void> {
      if (depth > 8) return; // safety cap against pathological nesting
      let offset = 0;
      const pageSize = 100;
      for (;;) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: pageSize, offset });
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const item of data) {
          const path = prefix ? `${prefix}/${item.name}` : item.name;
          // Folders come back with no metadata/id; files have metadata.
          const isFolder = !item.id && !(item as { metadata?: unknown }).metadata;
          if (isFolder) {
            await walk(path, depth + 1);
          } else {
            allPaths.push(path);
          }
        }
        if (data.length < pageSize) break;
        offset += pageSize;
      }
    }

    await walk('', 0);

    let removed = 0;
    for (let i = 0; i < allPaths.length; i += 100) {
      const chunk = allPaths.slice(i, i + 100);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) return `ERROR after ${removed}: ${error.message}`;
      removed += chunk.length;
    }
    return removed;
  } catch (e) {
    return `ERROR: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}

export async function POST(request: NextRequest) {
  // Fail closed: if no nuke code is configured, the feature does not exist.
  const expected = process.env.STORY_NUKE_CODE;
  if (!expected || expected.length < 12) {
    return NextResponse.json(
      { error: 'Nuke is not configured (set STORY_NUKE_CODE, min 12 chars).' },
      { status: 503 },
    );
  }

  let body: { nukeCode?: string; confirmPhrase?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { nukeCode, confirmPhrase } = body;

  // The secret code is the authority (works even without an admin session, so a
  // locked-out operator can still trigger it). We also note whether an admin
  // session was present, for the server-side log only.
  const adminUsername = await verifyAdminToken(request.headers.get('Authorization'));

  if (typeof nukeCode !== 'string' || !timingSafeEqualStr(nukeCode, expected)) {
    // Slow brute force; the DB-side rate limiter would be wiped by a nuke so we
    // use a fixed delay instead.
    await new Promise((r) => setTimeout(r, 1500));
    console.warn(
      `[Story NUKE] Rejected attempt — bad code. adminSession=${adminUsername ?? 'none'} ip=${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (confirmPhrase !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation failed — type exactly: ${CONFIRM_PHRASE}` },
      { status: 400 },
    );
  }

  console.warn(
    `[Story NUKE] FIRING — content wipe (accounts preserved). adminSession=${adminUsername ?? 'none'} ip=${request.headers.get('x-forwarded-for') ?? 'unknown'} at=${new Date().toISOString()}`,
  );

  const supabase = getSupabase();
  const tables: Record<string, number | string> = {};
  const buckets: Record<string, number | string> = {};

  // Wipe storage first (the most sensitive raw content), then DB rows.
  for (const bucket of STORY_BUCKETS) {
    buckets[bucket] = await emptyBucket(supabase, bucket);
  }

  for (const table of STORY_TABLES) {
    tables[table] = await wipeTable(supabase, table);
  }

  const anyError =
    Object.values(tables).some((v) => typeof v === 'string') ||
    Object.values(buckets).some((v) => typeof v === 'string');

  console.warn(
    `[Story NUKE] COMPLETE. anyError=${anyError} tables=${JSON.stringify(tables)} buckets=${JSON.stringify(buckets)}`,
  );

  return NextResponse.json({
    success: !anyError,
    message: anyError
      ? 'Nuke ran with some errors — review the report.'
      : 'NUKED. All Story content destroyed. Accounts and the app are intact — everyone can still log in; there is just nothing left inside.',
    wiped: { tables, buckets },
    note: 'Provider-side backups (Supabase PITR) are not affected by this and must be handled separately.',
  });
}
