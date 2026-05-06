// lib/montree/referral/code-gen.ts
//
// Generates unique referral codes of the form <FIRSTNAME>-XXXX where XXXX is
// 4 random characters from a 26-char alphabet (no I/O/0/1 — same alphabet as
// the existing 6-char teacher/principal login codes for visual consistency).
//
// Collisions on the random suffix are rare (26^4 = ~457k combinations per
// firstname prefix) but we still check the DB and retry up to 6 times.

import { getSupabase } from '@/lib/supabase-client';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randSuffix(len = 4): string {
  let s = '';
  for (let i = 0; i < len; i += 1) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

/**
 * Sanitise an arbitrary display name into the FIRSTNAME prefix used in codes.
 * - Takes the first word
 * - Strips diacritics + non-alphanumerics
 * - Uppercases
 * - Truncates to 12 chars max
 * - Falls back to 'AGENT' if nothing usable remains
 */
export function nameToPrefix(displayName: string): string {
  if (!displayName) return 'AGENT';
  const firstWord = displayName.trim().split(/\s+/)[0] || '';
  const ascii = firstWord
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);
  return ascii || 'AGENT';
}

/**
 * Generates a unique referral code, checking the DB to avoid collisions.
 * Returns the plaintext code (e.g. 'SARAH-K9X7').
 *
 * Throws if it cannot find a unique code after 6 attempts (statistically
 * impossible barring a corrupted DB).
 */
export async function generateUniqueReferralCode(displayName: string): Promise<string> {
  const supabase = getSupabase();
  const prefix = nameToPrefix(displayName);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `${prefix}-${randSuffix(4)}`;
    const { data, error } = await supabase
      .from('montree_referral_codes')
      .select('id')
      .eq('code', candidate)
      .maybeSingle();
    if (error) {
      // If the table doesn't exist yet (migration not run), surface clearly.
      throw new Error(`generateUniqueReferralCode: ${error.message}`);
    }
    if (!data) return candidate;
  }
  throw new Error('generateUniqueReferralCode: could not find a unique code after 6 attempts');
}
