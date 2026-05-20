#!/usr/bin/env node
// scripts/encrypt-existing-rows.mjs
//
// 🚨 Session 121 — backfill script.
//
// Encrypts every row in montree_thread_messages + montree_meeting_notes +
// montree_appointment_recordings where encryption_version IS NULL. Idempotent:
// already-encrypted rows are skipped. Safe to re-run after partial failure.
//
// USAGE:
//   # See what would change without writing anything
//   node scripts/encrypt-existing-rows.mjs --dry-run
//
//   # Run live (writes encrypted ciphertext + encryption_version=1)
//   node scripts/encrypt-existing-rows.mjs --commit
//
//   # Limit to one table at a time (useful when verifying incrementally)
//   node scripts/encrypt-existing-rows.mjs --commit --table=messages
//   node scripts/encrypt-existing-rows.mjs --commit --table=meeting-notes
//   node scripts/encrypt-existing-rows.mjs --commit --table=recordings
//
// PRE-REQUIREMENTS:
//   - migration 226 RUN in Supabase (encryption_version columns + feature flag)
//   - MONTREE_ENCRYPTION_KEY set in env (32 chars utf8)
//   - SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL set in env
//
// BATCHING:
//   Reads 100 rows at a time, encrypts in-memory, then writes the batch in
//   a single update statement per row (Supabase doesn't support multi-row
//   UPDATE-with-different-values out of the box). Per-row writes use the
//   row id as the WHERE clause so they're serialised safely.
//
// ROLLBACK:
//   This script does NOT delete plaintext or destroy data — every row keeps
//   the same id. If the encryption goes wrong, run the companion
//   decrypt-existing-rows.mjs to reverse it.

import { createClient } from '@supabase/supabase-js';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// tsx loader so we can import the TS module directly
register('tsx/esm', pathToFileURL('./'));

const { encryptField, isEncryptionConfigured } = await import('../lib/montree/messaging-crypto.ts');

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');
const tableArg = args.find((a) => a.startsWith('--table='))?.split('=')[1] || 'all';

if (!isEncryptionConfigured()) {
  console.error('✗ MONTREE_ENCRYPTION_KEY not set OR wrong length (must be 32 chars).');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BATCH_SIZE = 100;

console.log(`\n🔐 Encryption backfill — ${dryRun ? 'DRY RUN' : 'LIVE COMMIT'}\n`);
console.log(`   Table scope: ${tableArg}\n`);

let totalEncrypted = 0;
let totalSkipped = 0;
let totalFailed = 0;

async function backfillMessages() {
  console.log('── montree_thread_messages.body ─────────────────────────');
  let offset = 0;
  let batch = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('montree_thread_messages')
      .select('id, body')
      .is('encryption_version', null)
      .not('body', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id');
    if (error) {
      console.error(`  ✗ read error:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    batch++;
    console.log(`  batch ${batch} — ${data.length} row(s) at offset ${offset}`);

    for (const row of data) {
      try {
        if (!row.body) {
          totalSkipped++;
          continue;
        }
        if (dryRun) {
          totalEncrypted++; // count what would be done
          continue;
        }
        const ct = encryptField(row.body);
        const { error: updateErr } = await supabase
          .from('montree_thread_messages')
          .update({ body: ct, encryption_version: 1 })
          .eq('id', row.id)
          .is('encryption_version', null); // belt-and-braces — never overwrite an encrypted row
        if (updateErr) {
          console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
          totalFailed++;
        } else {
          totalEncrypted++;
        }
      } catch (err) {
        console.error(`    ✗ row ${row.id} encrypt failed:`, err);
        totalFailed++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break; // last partial batch
  }
}

async function backfillMeetingNotes() {
  console.log('── montree_meeting_notes (summary, transcript, notes) ───');
  let offset = 0;
  let batch = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('montree_meeting_notes')
      .select('id, summary, transcript, notes')
      .is('encryption_version', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id');
    if (error) {
      console.error(`  ✗ read error:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    batch++;
    console.log(`  batch ${batch} — ${data.length} row(s) at offset ${offset}`);

    for (const row of data) {
      try {
        // Encrypt only fields that have content. Each row gets ONE
        // encryption_version=1 covering all three columns.
        const encSummary = row.summary ? encryptField(row.summary) : null;
        const encTranscript = row.transcript ? encryptField(row.transcript) : null;
        const encNotes = row.notes ? encryptField(row.notes) : null;
        if (dryRun) {
          totalEncrypted++;
          continue;
        }
        const updatePayload = {
          encryption_version: 1,
        };
        if (encSummary !== null) updatePayload.summary = encSummary;
        if (encTranscript !== null) updatePayload.transcript = encTranscript;
        if (encNotes !== null) updatePayload.notes = encNotes;

        const { error: updateErr } = await supabase
          .from('montree_meeting_notes')
          .update(updatePayload)
          .eq('id', row.id)
          .is('encryption_version', null);
        if (updateErr) {
          console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
          totalFailed++;
        } else {
          totalEncrypted++;
        }
      } catch (err) {
        console.error(`    ✗ row ${row.id} encrypt failed:`, err);
        totalFailed++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }
}

async function backfillRecordings() {
  console.log('── montree_appointment_recordings (transcript, summary) ──');
  // First check if the table exists — migration 223 may not be run.
  const { error: probeErr } = await supabase
    .from('montree_appointment_recordings')
    .select('id')
    .limit(1);
  if (probeErr && probeErr.code === '42P01') {
    console.log('  skip — migration 223 not run, table does not exist.');
    return;
  }

  let offset = 0;
  let batch = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('montree_appointment_recordings')
      .select('id, transcript, summary')
      .is('encryption_version', null)
      .range(offset, offset + BATCH_SIZE - 1)
      .order('id');
    if (error) {
      console.error(`  ✗ read error:`, error);
      break;
    }
    if (!data || data.length === 0) break;
    batch++;
    console.log(`  batch ${batch} — ${data.length} row(s) at offset ${offset}`);

    for (const row of data) {
      try {
        const encTranscript = row.transcript ? encryptField(row.transcript) : null;
        const encSummary = row.summary ? encryptField(row.summary) : null;
        if (dryRun) {
          totalEncrypted++;
          continue;
        }
        const updatePayload = {
          encryption_version: 1,
        };
        if (encTranscript !== null) updatePayload.transcript = encTranscript;
        if (encSummary !== null) updatePayload.summary = encSummary;

        const { error: updateErr } = await supabase
          .from('montree_appointment_recordings')
          .update(updatePayload)
          .eq('id', row.id)
          .is('encryption_version', null);
        if (updateErr) {
          console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
          totalFailed++;
        } else {
          totalEncrypted++;
        }
      } catch (err) {
        console.error(`    ✗ row ${row.id} encrypt failed:`, err);
        totalFailed++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }
}

if (tableArg === 'all' || tableArg === 'messages') {
  await backfillMessages();
}
if (tableArg === 'all' || tableArg === 'meeting-notes') {
  await backfillMeetingNotes();
}
if (tableArg === 'all' || tableArg === 'recordings') {
  await backfillRecordings();
}

console.log('\n── Summary ────────────────────────────────────────────────');
console.log(`  Encrypted: ${totalEncrypted}`);
console.log(`  Skipped:   ${totalSkipped}`);
console.log(`  Failed:    ${totalFailed}`);
console.log(`  Mode:      ${dryRun ? 'DRY RUN — no writes made' : 'LIVE COMMIT'}`);
console.log('');

if (dryRun) {
  console.log('Re-run with --commit to actually encrypt these rows.');
}

process.exit(totalFailed > 0 ? 1 : 0);
