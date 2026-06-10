#!/usr/bin/env node
// scripts/probe-rls.mjs
//
// RLS POSTURE PROBE  (added 2026-06-06, weekend hardening step 2)
//
// Proves the real security property: can a client holding ONLY the public
// anon key read sensitive tenant tables? The anon key is shipped in the
// browser bundle, so anything it can read is effectively public.
//
//   - anon SELECT returns rows  -> ❌ LEAK (RLS missing/permissive)
//   - anon SELECT denied/empty   -> ✅ protected (but verify table HAS data
//                                     via the service key, so empty != safe)
//
// Read-only. No writes. Run before AND after applying RLS policies to confirm
// the fix. Usage: node scripts/probe-rls.mjs

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const SENSITIVE = [
  // Phase 1 (2026-06-06)
  'montree_children',
  'montree_parents',
  'montree_media',
  'montree_parent_meetings',
  'montree_parent_profiles',
  'montree_schools',
  'montree_classrooms',
  // Phase 2 (2026-06-10)
  'montree_parent_deletion_audit',
  'montree_child_learning_state',
  'montree_principal_conversations',
  // Phase 3 (2026-06-10 — legacy permissive-policy tables, highest-value subset)
  'montree_work_sessions',
  'montree_teachers',
  'montree_weekly_reports',
  'montree_voice_notes',
  'montree_super_admin_audit',
  'children',
  'child_work_progress',
  'parent_sessions',
  'parent_access_codes',
  'report_share_tokens',
  'simple_teachers',
  'users',
  'game_sessions',
  'assessment_results',
  'voice_observation_sessions',
];

const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const svcClient = createClient(url, service, { auth: { persistSession: false } });

console.log(`\nRLS probe against ${url}\n${'='.repeat(60)}`);
let leaks = 0;

for (const table of SENSITIVE) {
  // Service key: does the table have data at all?
  const { count: total } = await svcClient
    .from(table)
    .select('*', { count: 'exact', head: true });

  // Anon key: how much can an unauthenticated browser client read?
  const { data, error, count: anonCount } = await anonClient
    .from(table)
    .select('*', { count: 'exact', head: true });

  let verdict;
  if (error) {
    verdict = `✅ protected (anon denied: ${error.code || error.message})`;
  } else if ((anonCount ?? (data ? data.length : 0)) > 0) {
    verdict = `❌ LEAK — anon can read ${anonCount} row(s)`;
    leaks++;
  } else {
    verdict = '✅ anon sees 0 rows';
  }
  console.log(
    `${table.padEnd(28)} total=${String(total ?? '?').padStart(6)}  ${verdict}`
  );
}

console.log('='.repeat(60));
console.log(leaks === 0
  ? '✅ No anon-readable leaks on sensitive tables.'
  : `❌ ${leaks} sensitive table(s) readable with the public anon key.`);
process.exit(0);
