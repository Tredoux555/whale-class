#!/usr/bin/env node
// scripts/audit-tenant-scoping.mjs
//
// TENANT-ISOLATION REGRESSION GUARD  (added 2026-06-06, overnight hardening run)
//
// Background: every API route uses the Supabase SERVICE-ROLE client
// (lib/supabase-client.ts getSupabase / createAdminClient / createServerClient),
// which BYPASSES row-level security. Cross-tenant isolation therefore depends
// entirely on each route either:
//   (a) filtering tenant tables by school_id, OR
//   (b) using a central verify helper (verifySchoolRequest /
//       verifyChildBelongsToSchool / verifyParentRequest /
//       resolveAuthorizedParent / verifySuperAdminAuth), OR
//   (c) sitting behind the middleware admin-JWT gate (legacy groups).
//
// This script fails (exit 1) if any route touches a sensitive tenant table
// without at least one of those protections — i.e. a NEW route reintroduces
// the "secretly cross-tenant" bug class. Run it in CI / pre-push.
//
// It is intentionally CONSERVATIVE (mirrors the manual audit). Tighten the
// SENSITIVE_TABLES list over time.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SENSITIVE_TABLES = [
  'montree_parents',
  'montree_children',
  'montree_media',
  'montree_parent_meetings',
  'montree_parent_profiles',
];

// Path prefixes already gated by the middleware admin-JWT (see middleware.ts
// `requiresAdminJWT`). Routes under these need no in-file school scoping.
const MIDDLEWARE_GATED_PREFIXES = [
  'app/api/admin/',
  'app/api/whale/',           // except parent/ & teacher/ (those self-auth — still safe)
  'app/api/weekly-planning/',
  'app/api/curriculum-import/',
  'app/api/students/',
  'app/api/classroom/',
  'app/api/onboard/',
];

const VERIFY_HELPERS = [
  'verifyChildBelongsToSchool',
  'verifyChildrenBelongToSchool',
  'verifySchoolRequest',
  'verifyParentRequest',
  'resolveAuthorizedParent',
  'verifySuperAdminAuth',
  'verify-child-access',
];

function routesTouchingSensitiveTables() {
  const pattern = SENSITIVE_TABLES.join('\\|');
  let out = '';
  try {
    out = execSync(
      `git grep -l "${pattern}" -- "app/api/**/route.ts"`,
      { encoding: 'utf8' }
    );
  } catch (e) {
    // git grep exits 1 when there are no matches — treat as empty.
    out = e.stdout ? e.stdout.toString() : '';
  }
  return out.split('\n').map(s => s.trim()).filter(Boolean);
}

function isProtected(file) {
  if (MIDDLEWARE_GATED_PREFIXES.some(p => file.startsWith(p))) return true;
  const src = readFileSync(file, 'utf8');
  if (src.includes('school_id')) return true;
  if (VERIFY_HELPERS.some(h => src.includes(h))) return true;
  return false;
}

const files = routesTouchingSensitiveTables();
const violations = files.filter(f => !isProtected(f));

if (violations.length > 0) {
  console.error('\n❌ TENANT-SCOPING GUARD FAILED');
  console.error(
    `   ${violations.length} route(s) touch a sensitive tenant table without`
  );
  console.error(
    '   school_id filtering, a verify helper, or the middleware admin gate:\n'
  );
  for (const v of violations) console.error(`     - ${v}`);
  console.error(
    '\n   Add `.eq("school_id", auth.schoolId)`, a verify* helper, or confirm'
  );
  console.error(
    '   the path is middleware-gated, then re-run. See docs/SECURITY_AUDIT_SERVICE_ROLE_2026-06-06.md\n'
  );
  process.exit(1);
}

console.log(
  `✅ tenant-scoping guard: ${files.length} sensitive-table route(s) checked, 0 violations.`
);
