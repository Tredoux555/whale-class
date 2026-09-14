/**
 * scripts/transcode-vault-backlog.ts
 *
 * One-off: convert the vault videos that were uploaded BEFORE server-side
 * H.264 conversion shipped (migration 357). Those rows are iPhone .MOV/HEVC
 * and show as a black screen in Chrome, Firefox and on Android.
 *
 * Runs on the Mac against .env.local — it never needs Railway. It reuses the
 * EXACT same transcodeVaultVideo() the live route uses, so there is no second
 * copy of the conversion logic to drift.
 *
 *   # see what would be converted, touch nothing:
 *   node --experimental-strip-types scripts/transcode-vault-backlog.ts --dry-run
 *
 *   # convert for real, one file, then stop:
 *   node --experimental-strip-types scripts/transcode-vault-backlog.ts --limit 1
 *
 * Flags:
 *   --dry-run       list candidates and exit (default OFF — pass it first)
 *   --limit N       stop after N conversions (default 5)
 *   --id N          only this vault_files.id
 *
 * Requires ffmpeg + ffprobe on PATH (`brew install ffmpeg`).
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(process.cwd(), '.env.local') });

const argv = process.argv.slice(2);
const flag = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? '') : null;
};
const DRY_RUN = argv.includes('--dry-run');
const LIMIT = Math.max(1, Number(flag('--limit') ?? 5) || 5);
const ONLY_ID = flag('--id') ? Number(flag('--id')) : null;

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', '3gp', '3g2', 'm4v', 'wmv']);
const isVideo = (filename: string): boolean =>
  VIDEO_EXTS.has((filename || '').split('.').pop()?.toLowerCase() || '');

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked .env.local).');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const COLUMNS = 'id, filename, file_size, file_url, encrypted_key';
  const STALE_MS = 20 * 60 * 1000;

  const select = (cols: string) => {
    let q = supabase
      .from('vault_files')
      .select(cols)
      .is('deleted_at', null)
      .eq('encrypted_key', 'plain')
      .order('id', { ascending: true });
    if (ONLY_ID != null) q = q.eq('id', ONLY_ID);
    return q;
  };

  // Pre-migration-357 the status column does not exist yet. A DRY RUN should
  // still be able to show the backlog (that is the whole point of running it
  // before the migration), so fall back to a status-less select and treat every
  // row as null. An actual conversion is refused below — transcodeVaultVideo
  // returns 'migration_pending' because it cannot claim a row it cannot mark.
  // Two columns arrived in two migrations (357 status, 358 started_at), so the
  // fallback is a LADDER, not a single step — collapsing it misreads "358 not
  // run" as "357 not run" and refuses to convert a perfectly ready database.
  let migrationPending = false;
  let { data, error } = await select(`${COLUMNS}, transcode_status, transcode_started_at`);
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    ({ data, error } = await select(`${COLUMNS}, transcode_status`));
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      migrationPending = true;
      ({ data, error } = await select(COLUMNS));
    }
  }
  if (error) {
    console.error('query failed:', error.message);
    process.exit(1);
  }

  type Row = {
    id: number; filename: string; file_size: number;
    transcode_status?: string | null; transcode_started_at?: string | null;
  };
  const rows = ((data || []) as unknown as Row[]).map(r => ({ ...r, transcode_status: r.transcode_status ?? null }));
  // Candidates = plain VIDEOS not yet finished. null covers the whole backlog.
  // A 'processing' row whose claim is older than STALE_MS (or has no stamp at
  // all) is a worker that died mid-encode — reclaimable, same rule as the lib.
  const stale = (r: Row) =>
    r.transcode_status === 'processing' &&
    (!r.transcode_started_at || Date.now() - Date.parse(r.transcode_started_at) > STALE_MS);
  const candidates = rows.filter(
    r => isVideo(r.filename) &&
      (r.transcode_status == null || r.transcode_status === 'pending' ||
        r.transcode_status === 'failed' || stale(r))
  );

  console.log(`vault plain rows: ${rows.length} · video candidates: ${candidates.length}`);
  for (const r of candidates) {
    console.log(
      `  #${r.id}  ${r.filename}  ${(r.file_size / 1048576).toFixed(1)}MB  status=${r.transcode_status ?? 'null'}`
    );
  }

  if (migrationPending) {
    console.log('\n⚠  vault_files.transcode_status does not exist yet — run migration 357.');
  }
  if (DRY_RUN) {
    console.log(`\nDRY RUN — nothing touched. Would convert up to ${LIMIT}.`);
    return;
  }
  if (migrationPending) {
    console.error('Refusing to convert before migration 357 is applied.');
    process.exit(1);
  }
  if (candidates.length === 0) return;

  // 🚨 Imported through a computed specifier ON PURPOSE. The runtime is
  // `node --experimental-strip-types`, which needs the explicit .ts path, while
  // tsconfig has allowImportingTsExtensions off — a literal './x.ts' specifier
  // would fail `tsc --noEmit`. A computed specifier keeps both happy.
  const modUrl = new URL('../lib/story/vault/transcode.ts', import.meta.url).href;
  const mod = (await import(modUrl)) as {
    transcodeVaultVideo: (id: number, opts?: { supabase?: unknown }) => Promise<{
      ok: boolean; fileId: number; newPath?: string; skipped?: string; error?: string;
    }>;
  };

  let done = 0;
  for (const r of candidates) {
    if (done >= LIMIT) break;
    process.stdout.write(`converting #${r.id} ${r.filename} … `);
    const res = await mod.transcodeVaultVideo(r.id, { supabase });
    console.log(res.ok ? (res.skipped ? `skipped (${res.skipped})` : `ok → ${res.newPath}`) : `FAILED: ${res.error}`);
    done++;
  }
  console.log(`\nprocessed ${done} of ${candidates.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
