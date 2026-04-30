#!/usr/bin/env node
/**
 * One-time backfill: run apply_global_translations() against every existing
 * classroom in production.
 *
 * Fixes Miss Chen 2 and any other classroom that was seeded English-only before
 * the global translation pipeline existed. Safe to run multiple times — the
 * Postgres function uses COALESCE so it never overwrites existing translations.
 *
 * Each classroom takes ~100–300 ms (single RPC, all 11 locale UPDATEs server-side).
 *
 * Usage:
 *   node scripts/backfill-all-classroom-translations.mjs           # all classrooms
 *   node scripts/backfill-all-classroom-translations.mjs <uuid>    # one classroom
 *   node scripts/backfill-all-classroom-translations.mjs --dry-run # list only
 *
 * Required env (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_ID = process.argv.find((a) => /^[0-9a-f]{8}-[0-9a-f]{4}/.test(a));

async function sb(path, opts = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 200)}`);
  }
  return res;
}

async function listClassrooms() {
  if (ONLY_ID) {
    return [{ id: ONLY_ID, name: '(single, supplied via CLI)' }];
  }
  const res = await sb(
    `montree_classrooms?select=id,name,school_id&order=created_at.asc`
  );
  return await res.json();
}

async function applyOne(classroomId) {
  const res = await sb(`rpc/apply_global_translations`, {
    method: 'POST',
    body: JSON.stringify({ p_classroom_id: classroomId }),
  });
  const text = await res.text();
  // RPC returns the integer row count as a number (or quoted JSON)
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

async function main() {
  console.log('--- backfill-all-classroom-translations ---');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (ONLY_ID) console.log(`Targeting single classroom: ${ONLY_ID}`);
  console.log('');

  const classrooms = await listClassrooms();
  console.log(`Found ${classrooms.length} classroom(s) to process.`);
  console.log('');

  if (DRY_RUN) {
    for (const c of classrooms) {
      console.log(`  ${c.id}  ${c.name || '(unnamed)'}`);
    }
    console.log('');
    console.log('Dry run complete. No writes performed.');
    return;
  }

  let totalUpdates = 0;
  let succeeded = 0;
  let failed = 0;

  for (const c of classrooms) {
    try {
      const updated = await applyOne(c.id);
      totalUpdates += updated;
      succeeded++;
      console.log(`  ✔ ${c.id}  ${c.name || ''}  →  ${updated} cells updated`);
    } catch (err) {
      failed++;
      console.error(`  ✖ ${c.id}  ${c.name || ''}  →  ${err.message}`);
    }
  }

  console.log('');
  console.log(`✔ Done. ${succeeded} succeeded, ${failed} failed. Total cells updated: ${totalUpdates}`);
}

main().catch((err) => {
  console.error('✖ Failed:', err.message);
  process.exit(1);
});
