// lib/montree/org/director-login-code.ts
//
// The organisation director's 6-character login code (migration 317).
//
// One generator for the whole product: generateSecureCode() in lib/montree/secure-code.ts —
// crypto.randomBytes with rejection sampling over the house 32-character alphabet (no 0/O/1/I).
// That is exactly what /api/montree/admin/teachers mints for teachers and what
// /api/montree/principal/setup mints for principals, and a director's code must be
// indistinguishable from theirs: same length, same alphabet, same entropy. Nothing here
// re-implements any of it — this module only adds the two things a director code needs on top:
//
//   1. UNIQUENESS — and 🚨 uniqueness ACROSS ALL THREE code tables, not just this one.
//      login_code is the lookup key on the code sign-in path, so a collision would be an
//      account-takeover bug rather than a cosmetic clash. See probeLoginCode() below for why
//      "just this table" stopped being enough the moment director codes joined the unified
//      login box. issueDirectorLoginCode() probes before it commits and retries a handful of
//      times. (32^6 ≈ 1.07 billion — a collision is already vanishingly unlikely; the probe is
//      belt and braces, and cheap.)
//
//   2. FAIL-SOFT. Every caller is a path that must still succeed on a database where migration
//      317 has not been run yet: registration must not 500 because a bonus credential could not
//      be minted. issueDirectorLoginCode() returns null in that case and the caller carries on
//      without a code.
//
// Normalisation matches the teacher/principal code paths exactly (trim + uppercase), so a
// director who types their code in lower case, or pastes it with the trailing space a drag
// selection always catches, still gets in.

import { generateSecureCode } from '@/lib/montree/secure-code';
import { isOrgMigrationPending } from './verify-org-request';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

/** Length of a director code — the same 6 characters every other Montree code uses. */
export const DIRECTOR_CODE_LENGTH = 6;

/**
 * Normalise a code the way every other Montree code login does: trim, then upper-case.
 * Returns null for anything that is not a plausible code, so callers can fall through to the
 * email + password branch instead of running a pointless lookup.
 */
export function normalizeDirectorCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase();
  if (clean.length !== DIRECTOR_CODE_LENGTH) return null;
  return clean;
}

/**
 * Every table whose `login_code` column can be typed into the ONE code box at
 * /montree/login-select and resolved by /api/montree/auth/unified.
 *
 * 🚨 THE REASON THIS LIST EXISTS. Each of these columns is UNIQUE within its OWN table
 * (montree_teachers.login_code from migration 069, montree_school_admins.login_code from 194,
 * montree_organization_admins.login_code from 317) and nothing has ever enforced uniqueness
 * BETWEEN them. That was harmless while a director code only resolved at /montree/org/login:
 * the three namespaces never met. They meet now — unified tries principal → director →
 * teacher against all three — so an identical code in two tables is no longer a cosmetic
 * clash, it is a CROSS-TENANT account takeover: the higher-priority table wins, and whoever
 * legitimately holds the code in the lower-priority one is handed somebody else's session
 * (and silently locked out of their own). Every code minted for any of these tables must be
 * probed against ALL of them.
 */
export const LOGIN_CODE_TABLES = [
  'montree_teachers',
  'montree_school_admins',
  'montree_organization_admins',
] as const;

export type LoginCodeTable = (typeof LOGIN_CODE_TABLES)[number];

/**
 * Is `code` already spoken for anywhere a code can be typed?
 *
 * Three states, because the caller's right move differs for each:
 *   'free'  — no row in any code table holds it. Safe to mint.
 *   'taken' — somebody holds it. Draw again.
 *   'error' — a probe could not be run for a reason that is NOT a missing table/column.
 *             Never treated as 'free': minting a colliding code is unrecoverable, refusing to
 *             mint one is a retry. Callers bail rather than guess.
 *
 * A 42703 / 42P01 on an INDIVIDUAL table is deliberately NOT an error — it means that table or
 * column does not exist on this database (migration 194 or 317 not run), and a column that does
 * not exist cannot be a collision target on that database. Skipping it keeps code issuance
 * working on a half-migrated deployment, which is the whole fail-soft posture of this module.
 *
 * @param exclude  when REgenerating for an existing row, that row is not a collision with
 *                 itself — pass its table + id so a (theoretically possible) re-draw of the
 *                 holder's current code is not rejected.
 */
export async function probeLoginCode(
  supabase: SupabaseClient,
  code: string,
  exclude?: { table: LoginCodeTable; id: string },
): Promise<'free' | 'taken' | 'error'> {
  for (const table of LOGIN_CODE_TABLES) {
    let query = supabase.from(table).select('id').eq('login_code', code);
    if (exclude?.table === table) query = query.neq('id', exclude.id);

    // limit(1) rather than maybeSingle(): a pre-existing duplicate inside one table (possible
    // on montree_school_admins, whose UNIQUE is partial) would make maybeSingle() raise, and
    // "two rows already hold this" is emphatically a collision, not a failure to answer.
    const { data, error } = await query.limit(1);

    if (error) {
      if (isOrgMigrationPending(error)) continue; // column/table absent here — nothing to hit
      console.error(`[login-code] collision probe on ${table} failed:`, error.message);
      return 'error';
    }
    if (data && data.length > 0) return 'taken';
  }
  return 'free';
}

/**
 * Mint a login code no teacher, principal OR director holds — see probeLoginCode above for why
 * all three, not just this table.
 *
 * Returns the plaintext code (the caller stores it AND hands it back to the person — it is
 * meant to be read), or null when a code cannot be minted right now. null is not an error the
 * caller should surface: on a database where migration 317 has not been run it means the column
 * does not exist, and the director simply signs in with their email and password like they
 * always could.
 *
 * @param excludeAdminId  when regenerating for an existing director, their own row is not a
 *                        collision — pass their id so a (theoretically possible) re-draw of
 *                        their current code is not rejected.
 */
export async function issueDirectorLoginCode(
  supabase: SupabaseClient,
  excludeAdminId?: string,
): Promise<string | null> {
  // The director's OWN column is checked first and separately, because a 42703 HERE is the
  // migration-pending case this module is built around (return null, keep the password door)
  // rather than a table to skip past.
  const { error: columnErr } = await supabase
    .from('montree_organization_admins')
    .select('login_code')
    .limit(1);
  if (columnErr) {
    if (isOrgMigrationPending(columnErr)) return null;
    console.error('[montree-org] director code column probe failed:', columnErr);
    return null;
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateSecureCode(DIRECTOR_CODE_LENGTH);
    const verdict = await probeLoginCode(
      supabase,
      candidate,
      excludeAdminId ? { table: 'montree_organization_admins', id: excludeAdminId } : undefined,
    );
    if (verdict === 'free') return candidate;
    if (verdict === 'error') return null; // already logged; fail soft, keep the password door
  }

  console.error('[montree-org] could not find a free director login code after 6 attempts');
  return null;
}
