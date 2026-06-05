#!/usr/bin/env node
// scripts/ts-error-budget.mjs
//
// TYPESCRIPT ERROR RATCHET  (added 2026-06-06, overnight hardening run)
//
// The build ships with `typescript.ignoreBuildErrors: true` and currently has
// a large pre-existing error backlog. We are NOT turning strict checking on in
// one shot. Instead this guard enforces a one-way ratchet: the error count may
// only ever go DOWN. New code may not add net-new type errors; fixing errors
// lowers the baseline.
//
// Usage:
//   node scripts/ts-error-budget.mjs           # check against baseline
//   node scripts/ts-error-budget.mjs --update   # lower baseline to current
//
// Wire into CI / pre-push. Full tsc run takes ~2-3 min on this repo.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const BASELINE_FILE = new URL('./ts-error-baseline.json', import.meta.url);

function countErrors() {
  let out = '';
  try {
    out = execSync('npx tsc --noEmit --incremental false', { encoding: 'utf8' });
  } catch (e) {
    // tsc exits non-zero when there are errors — that's expected.
    out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
  }
  const matches = out.match(/error TS\d+/g);
  return matches ? matches.length : 0;
}

const current = countErrors();
const update = process.argv.includes('--update');

if (update || !existsSync(BASELINE_FILE)) {
  writeFileSync(BASELINE_FILE, JSON.stringify({ maxErrors: current }, null, 2) + '\n');
  console.log(`📌 ts-error baseline set to ${current}.`);
  process.exit(0);
}

const { maxErrors } = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));

if (current > maxErrors) {
  console.error(
    `\n❌ TS error budget exceeded: ${current} errors (baseline ${maxErrors}).`
  );
  console.error('   New code introduced type errors. Fix them, or justify and');
  console.error('   re-baseline with: node scripts/ts-error-budget.mjs --update\n');
  process.exit(1);
}

if (current < maxErrors) {
  console.log(
    `✅ ts-error budget: ${current} errors — ${maxErrors - current} below baseline (${maxErrors}).`
  );
  console.log('   Nice. Lower the baseline: node scripts/ts-error-budget.mjs --update');
  process.exit(0);
}

console.log(`✅ ts-error budget: ${current} errors, at baseline (${maxErrors}).`);
