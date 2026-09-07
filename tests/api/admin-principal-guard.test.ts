// tests/api/admin-principal-guard.test.ts
//
// Static guard for audit finding 7 (07-verify-security.md): middleware.ts gates
// /api/admin/* and /api/whale/* on the admin JWT but NOT /api/montree/admin/*, and
// verifySchoolRequest returns role 'teacher' just as happily as 'principal'. So every
// cockpit route under app/api/montree/admin/ is one careless `verifySchoolRequest` away
// from letting any teacher in the school act as their own principal.
//
// This test does not exercise the handlers (they need a live Supabase). It reads the
// source of every route.ts in that directory and requires each one to make a deliberate
// choice: either import verifyPrincipalRequest, or carry an explicit
//
//   // principal-guard: exempt — <reason>
//
// line saying why it does not. A route added to this directory with neither fails here,
// which is the whole point — the next route inherits the decision instead of the bug.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ADMIN_API_DIR = join(REPO_ROOT, 'app/api/montree/admin');

/**
 * return-to-admin is the one route that is self-limiting by construction: it takes no
 * body and acts only on the signed `actingPrincipalId` claim already on the caller's own
 * token (a claim only /admin/enter-classroom can mint). Requiring a principal session
 * there would lock the principal out of the way BACK to their cockpit.
 */
const EXCLUDED = new Set(['return-to-admin/route.ts']);

/** The exemption marker a route must carry if it does not use the shared guard. */
const EXEMPT_RE = /\/\/\s*principal-guard:\s*exempt\s*—\s*\S+/;

function findRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      out.push(...findRoutes(full, rel));
    } else if (entry === 'route.ts') {
      out.push(rel);
    }
  }
  return out;
}

describe('app/api/montree/admin/** principal guard', () => {
  const routes = findRoutes(ADMIN_API_DIR).filter((r) => !EXCLUDED.has(r));

  it('finds the admin routes at all (guards against a silent glob miss)', () => {
    expect(routes.length).toBeGreaterThan(30);
  });

  it.each(routes)('%s uses verifyPrincipalRequest or is explicitly exempt', (rel) => {
    const src = readFileSync(join(ADMIN_API_DIR, rel), 'utf8');
    const guarded = src.includes('verifyPrincipalRequest');
    const exempt = EXEMPT_RE.test(src);
    expect(
      guarded || exempt,
      `${rel} calls neither verifyPrincipalRequest nor carries a ` +
        `"// principal-guard: exempt — <reason>" comment. Any authenticated teacher in ` +
        `the school can reach it. Add the guard, or the comment with a real reason.`,
    ).toBe(true);
  });

  it('every exempt route states a reason', () => {
    for (const rel of routes) {
      const src = readFileSync(join(ADMIN_API_DIR, rel), 'utf8');
      if (src.includes('verifyPrincipalRequest')) continue;
      const line = src.split('\n').find((l) => l.includes('principal-guard: exempt'));
      expect(line, `${rel} is exempt without a marker line`).toBeTruthy();
      // "— <reason>" must be more than a shrug.
      const reason = (line || '').split('—').slice(1).join('—').trim();
      expect(reason.length, `${rel} exemption reason is too thin: "${reason}"`).toBeGreaterThan(20);
    }
  });

  it('the routes named in audit finding 7 are guarded, not exempt', () => {
    const MUST_BE_GUARDED = [
      'overview/route.ts',
      'activity/route.ts',
      'classrooms/route.ts',
      'classrooms/[classroomId]/route.ts',
      'students/route.ts',
      'students/search/route.ts',
      'import-students/route.ts',
      'import/route.ts',
      'teachers/[teacherId]/route.ts',
      'teachers/[teacherId]/classrooms/route.ts',
      'settings/route.ts',
      'reports/route.ts',
      'today/route.ts',
      'astra-thread/route.ts',
      'backfill-guides/route.ts',
      'backfill-curriculum/route.ts',
      'reseed-curriculum/route.ts',
    ];
    for (const rel of MUST_BE_GUARDED) {
      const src = readFileSync(join(ADMIN_API_DIR, rel), 'utf8');
      expect(src.includes('verifyPrincipalRequest'), `${rel} lost its principal guard`).toBe(true);
      expect(src.includes('verifySchoolRequest'), `${rel} still calls verifySchoolRequest`).toBe(false);
    }
  });

  it('backfill-guides is POST-only and gates all=true on super-admin', () => {
    const src = readFileSync(join(ADMIN_API_DIR, 'backfill-guides/route.ts'), 'utf8');
    expect(src.includes('export async function POST')).toBe(true);
    expect(src.includes('export async function GET')).toBe(false);
    expect(src.includes('verifySuperAdminAuth')).toBe(true);
  });
});
