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
//   1. UNIQUENESS. login_code is the lookup key on the code sign-in path, so a collision would
//      be an account-takeover bug rather than a cosmetic clash. issueDirectorLoginCode() probes
//      before it commits and retries a handful of times. (32^6 ≈ 1.07 billion — a collision is
//      already vanishingly unlikely; the probe is belt and braces, and cheap.)
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
 * Mint a login code that no other director holds.
 *
 * Returns the plaintext code (the caller stores it AND hands it back to the person — it is
 * meant to be read), or null when a code cannot be minted right now. null is not an error the
 * caller should surface: it means migration 317 has not been run, and the director simply signs
 * in with their email and password like they always could.
 *
 * @param excludeAdminId  when regenerating for an existing director, their own row is not a
 *                        collision — pass their id so a (theoretically possible) re-draw of
 *                        their current code is not rejected.
 */
export async function issueDirectorLoginCode(
  supabase: SupabaseClient,
  excludeAdminId?: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateSecureCode(DIRECTOR_CODE_LENGTH);

    let query = supabase
      .from('montree_organization_admins')
      .select('id')
      .eq('login_code', candidate);
    if (excludeAdminId) query = query.neq('id', excludeAdminId);

    const { data, error } = await query.maybeSingle();

    if (error) {
      // Column (or table) missing → migration pending. Not an error worth failing a
      // registration over; the director keeps their email + password door.
      if (isOrgMigrationPending(error)) return null;
      console.error('[montree-org] director code collision probe failed:', error);
      return null;
    }
    if (!data) return candidate;
  }

  console.error('[montree-org] could not find a free director login code after 6 attempts');
  return null;
}
