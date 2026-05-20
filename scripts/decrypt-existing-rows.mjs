#!/usr/bin/env node
// scripts/decrypt-existing-rows.mjs
//
// 🚨 Session 121 — ROLLBACK script. Reverses encrypt-existing-rows.mjs.
//
// Decrypts every row where encryption_version=1 and writes the plaintext
// back, then clears encryption_version to NULL. Idempotent: plaintext
// rows (version IS NULL) are skipped.
//
// USAGE:
//   # Dry run — see what would be reversed
//   node scripts/decrypt-existing-rows.mjs --dry-run
//
//   # Live rollback
//   node scripts/decrypt-existing-rows.mjs --commit
//
//   # Per-table rollback
//   node scripts/decrypt-existing-rows.mjs --commit --table=messages
//
// WHEN TO RUN:
//   - encryption_v1 flag has been flipped OFF in feature definitions
//   - AND you want every row reverted to plaintext (e.g. for export,
//     for an emergency rollback after a bug, for key rotation handoff)
//
// PRE-REQUIREMENTS:
//   - MONTREE_ENCRYPTION_KEY set in env (32 chars utf8 — the SAME key used
//     to encrypt, otherwise rows return DECRYPT_FAILURE_SENTINEL)
//   - SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL set in env
//
// FAILURE BEHAVIOUR:
//   If a row decrypts to the DECRYPT_FAILURE_SENTINEL string, the script
//   LOGS the row id and SKIPS it (doesn't write the sentinel back to the
//   DB). This guards against silent data corruption when the key is wrong.

import { createClient } from '@supabase/supabase-js';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('tsx/esm', pathToFileURL('./'));

const { decryptField, isEncryptionConfigured, DECRYPT_FAILURE_SENTINEL } = await import(
  '../lib/montree/messaging-crypto.ts'
);

const args = process.argv.slice(2);
const dryRun = !args.includes('--commit');
const tableArg = args.find((a) => a.startsWith('--table='))?.split('=')[1] || 'all';

if (!isEncryptionConfigured()) {
  console.error('✗ MONTREE_ENCRYPTION_KEY not set OR wrong length.');
  console.error('  Decrypt requires the SAME key the data was encrypted with.');
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

console.log(`\n🔓 Decryption rollback — ${dryRun ? 'DRY RUN' : 'LIVE COMMIT'}\n`);
console.log(`   Table scope: ${tableArg}\n`);

let totalDecrypted = 0;
let totalSkipped = 0;
let totalFailed = 0;
let totalSentinelHits = 0;

function safeDecrypt(ciphertext, rowId, columnName) {
  const plain = decryptField(ciphertext);
  if (plain === DECRYPT_FAILURE_SENTINEL) {
    console.error(`    ✗ row ${rowId} column ${columnName} returned sentinel — key mismatch?`);
    totalSentinelHits++;
    return null;
  }
  return plain;
}

async function rollbackMessages() {
  console.log('── montree_thread_messages.body ─────────────────────────');
  let offset = 0;
  let batch = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('montree_thread_messages')
      .select('id, body, encryption_version')
      .eq('encryption_version', 1)
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
      if (!row.body) {
        totalSkipped++;
        continue;
      }
      const plain = safeDecrypt(row.body, row.id, 'body');
      if (plain === null) {
        totalFailed++;
        continue;
      }
      if (dryRun) {
        totalDecrypted++;
        continue;
      }
      const { error: updateErr } = await supabase
        .from('montree_thread_messages')
        .update({ body: plain, encryption_version: null })
        .eq('id', row.id)
        .eq('encryption_version', 1); // belt-and-braces
      if (updateErr) {
        console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
        totalFailed++;
      } else {
        totalDecrypted++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }
}

async function rollbackMeetingNotes() {
  console.log('── montree_meeting_notes (summary, transcript, notes) ───');
  let offset = 0;
  let batch = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('montree_meeting_notes')
      .select('id, summary, transcript, notes, encryption_version')
      .eq('encryption_version', 1)
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
      const plainSummary = row.summary ? safeDecrypt(row.summary, row.id, 'summary') : null;
      const plainTranscript = row.transcript ? safeDecrypt(row.transcript, row.id, 'transcript') : null;
      const plainNotes = row.notes ? safeDecrypt(row.notes, row.id, 'notes') : null;

      // If any column returned sentinel, skip the whole row (otherwise we'd
      // leave that column as the sentinel string in the DB — visible data corruption).
      const anyFailure =
        (row.summary && plainSummary === null) ||
        (row.transcript && plainTranscript === null) ||
        (row.notes && plainNotes === null);
      if (anyFailure) {
        totalFailed++;
        continue;
      }
      if (dryRun) {
        totalDecrypted++;
        continue;
      }
      const updatePayload = { encryption_version: null };
      if (row.summary) updatePayload.summary = plainSummary;
      if (row.transcript) updatePayload.transcript = plainTranscript;
      if (row.notes) updatePayload.notes = plainNotes;

      const { error: updateErr } = await supabase
        .from('montree_meeting_notes')
        .update(updatePayload)
        .eq('id', row.id)
        .eq('encryption_version', 1);
      if (updateErr) {
        console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
        totalFailed++;
      } else {
        totalDecrypted++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }
}

async function rollbackRecordings() {
  console.log('── montree_appointment_recordings (transcript, summary) ──');
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
      .select('id, transcript, summary, encryption_version')
      .eq('encryption_version', 1)
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
      const plainTranscript = row.transcript ? safeDecrypt(row.transcript, row.id, 'transcript') : null;
      const plainSummary = row.summary ? safeDecrypt(row.summary, row.id, 'summary') : null;

      const anyFailure =
        (row.transcript && plainTranscript === null) ||
        (row.summary && plainSummary === null);
      if (anyFailure) {
        totalFailed++;
        continue;
      }
      if (dryRun) {
        totalDecrypted++;
        continue;
      }
      const updatePayload = { encryption_version: null };
      if (row.transcript) updatePayload.transcript = plainTranscript;
      if (row.summary) updatePayload.summary = plainSummary;

      const { error: updateErr } = await supabase
        .from('montree_appointment_recordings')
        .update(updatePayload)
        .eq('id', row.id)
        .eq('encryption_version', 1);
      if (updateErr) {
        console.error(`    ✗ row ${row.id} write failed:`, updateErr.message);
        totalFailed++;
      } else {
        totalDecrypted++;
      }
    }
    offset += BATCH_SIZE;
    if (data.length < BATCH_SIZE) break;
  }
}

if (tableArg === 'all' || tableArg === 'messages') {
  await rollbackMessages();
}
if (tableArg === 'all' || tableArg === 'meeting-notes') {
  await rollbackMeetingNotes();
}
if (tableArg === 'all' || tableArg === 'recordings') {
  await rollbackRecordings();
}

console.log('\n── Summary ────────────────────────────────────────────────');
console.log(`  Decrypted:      ${totalDecrypted}`);
console.log(`  Skipped:        ${totalSkipped}`);
console.log(`  Failed:         ${totalFailed}`);
console.log(`  Sentinel hits:  ${totalSentinelHits} (key mismatch — investigate)`);
console.log(`  Mode:           ${dryRun ? 'DRY RUN — no writes made' : 'LIVE COMMIT'}`);
console.log('');

if (totalSentinelHits > 0) {
  console.log('⚠ Sentinel hits suggest the encryption key in env does NOT match');
  console.log('  the key used when these rows were encrypted. DO NOT proceed with');
  console.log('  --commit until this is resolved — otherwise rows fail-skipped here');
  console.log('  are permanently stuck.');
}

process.exit(totalFailed > 0 ? 1 : 0);
