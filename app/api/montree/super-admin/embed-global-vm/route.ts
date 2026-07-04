// app/api/montree/super-admin/embed-global-vm/route.ts
//
// One-shot BACKFILL of the montree_global_visual_memory.embedding column
// (migration 282). For each active global-VM row, embeds
// visual_description (+ key_materials) via OpenAI text-embedding-3-small
// (1536-dim, the same model Whisper's OPENAI_API_KEY already covers) and
// writes the `embedding` column so runtime visual-similarity retrieval
// (montree_global_vm_search RPC) can drive photo-ID candidate recall.
//
// 🚨 Runs ON Railway so OPENAI_API_KEY never leaves the server. Trigger once
//    from the super-admin cron-triggers panel, or:
//      curl -X POST https://montree.xyz/api/montree/super-admin/embed-global-vm \
//        -H "x-cron-secret: $CRON_SECRET"
//    RE-RUN after ANY re-seed of the global VM (a re-seed rewrites
//    visual_description / negative text but leaves the stale embedding — the
//    seed does not clear it, so run this with ?force=1 after every seed change,
//    or the default NULL-only pass after a fresh migration).
//
// Callers:
//   1. Super-admin session (x-super-admin-token / x-super-admin-password)
//   2. Railway scheduled task / curl (header x-cron-secret: <CRON_SECRET>)
//
// Query params:
//   ?force=1   re-embed EVERY active row (use after a re-seed changed the text)
//   (default)  only embed rows whose embedding is currently NULL
//   ?dry_run=1 report how many rows WOULD be embedded, embed nothing
//
// Idempotent. Fails gracefully when migration 282 hasn't run (42703 / 42883).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { embedText } from '@/lib/montree/tracy/corpus/embeddings';

// OpenAI embedding of ~270 rows at concurrency 5 is ~1-2 min. Give headroom.
export const maxDuration = 300;

// Same concurrency cap embedTextBatch uses — friendly to OpenAI rate limits.
const CONCURRENCY = 5;

type GlobalRow = {
  id: string;
  work_key: string;
  work_name: string;
  visual_description: string | null;
  key_materials: string[] | null;
  embedding: unknown;
};

/** Build the text we embed for a row — the visual fingerprint used for recall. */
function embedTextForRow(row: GlobalRow): string {
  const parts: string[] = [];
  if (row.visual_description) parts.push(row.visual_description.trim());
  if (Array.isArray(row.key_materials) && row.key_materials.length > 0) {
    parts.push(row.key_materials.filter(Boolean).join('; '));
  }
  return parts.join('\n').trim();
}

function isSchemaMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === '42703' || // column does not exist
    e.code === '42P01' || // table does not exist
    e.code === '42883' || // function does not exist
    (e.message ?? '').includes('does not exist')
  );
}

export async function POST(request: NextRequest) {
  // Auth: super-admin session OR cron secret header (mirrors i18n-sync).
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedCronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && !!expectedCronSecret && cronSecret === expectedCronSecret;
  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured on this server' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === '1';
  const dryRun = url.searchParams.get('dry_run') === '1';

  const supabase = getSupabase();

  // Fetch active rows. When not forcing, only those missing an embedding.
  let query = supabase
    .from('montree_global_visual_memory')
    .select('id, work_key, work_name, visual_description, key_materials, embedding')
    .eq('is_active', true);
  if (!force) query = query.is('embedding', null);

  const { data: rows, error: selErr } = await query;
  if (selErr) {
    if (isSchemaMissing(selErr)) {
      return NextResponse.json(
        {
          error: 'embedding column missing — run migration 282 first',
          detail: selErr.message,
          migration: '282_global_vm_embedding.sql',
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  const candidates = (rows ?? []).filter((r) => embedTextForRow(r as GlobalRow).length > 0);
  const emptyText = (rows ?? []).length - candidates.length;

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      would_embed: candidates.length,
      skipped_empty_text: emptyText,
      force,
    });
  }

  let embedded = 0;
  let failed = 0;
  const errorSamples: string[] = [];

  // Process in concurrency-capped batches: embed each row, write its embedding.
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY) as GlobalRow[];
    const results = await Promise.all(
      batch.map(async (row) => {
        try {
          const vector = await embedText(embedTextForRow(row));
          return { row, vector, err: null as string | null };
        } catch (e) {
          return { row, vector: null, err: e instanceof Error ? e.message : String(e) };
        }
      }),
    );

    for (const res of results) {
      if (!res.vector) {
        failed++;
        if (errorSamples.length < 5) errorSamples.push(`${res.row.work_key}: ${res.err}`);
        continue;
      }
      const { error: updErr } = await supabase
        .from('montree_global_visual_memory')
        // pgvector accepts a JS number[] via PostgREST (same pattern as
        // montree_tracy_corpus inserts). Cast for the untyped client.
        .update({ embedding: res.vector as unknown as string })
        .eq('id', res.row.id);
      if (updErr) {
        if (isSchemaMissing(updErr)) {
          return NextResponse.json(
            {
              error: 'embedding column missing — run migration 282 first',
              detail: updErr.message,
              migration: '282_global_vm_embedding.sql',
              embedded_before_failure: embedded,
            },
            { status: 400 },
          );
        }
        failed++;
        if (errorSamples.length < 5) errorSamples.push(`${res.row.work_key}: ${updErr.message}`);
        continue;
      }
      embedded++;
    }
  }

  return NextResponse.json({
    success: true,
    force,
    total_active_candidates: candidates.length,
    embedded,
    failed,
    skipped_empty_text: emptyText,
    error_samples: errorSamples,
  });
}
