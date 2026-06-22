// lib/story/coach/public-account.ts
//
// Public (word-of-mouth) Lyf Coach signup helpers — shared by the signup +
// login routes. A stranger creates their OWN sealed coach space here, with NO
// owner involvement and NO family/captain/covert surfaces.
//
// 🚨 Safety (see docs/handoffs/LYF_COACH_PUBLIC_SIGNUP_PLAN.md):
//   • Public accounts are always role='adult' → getFamilyRole returns 'adult'
//     → the Family panel, captain channel + Family Brain are all 403-gated.
//   • Each account gets a UNIQUE space → space-scoped reads only ever see their
//     own data; owner-only (space==='tredoux') + vault + covert surfaces stay
//     sealed. The owner's shared 'tredoux' space is the only intentional
//     non-unique space, and it is never generated here.
//   • Plain server-side bcrypt accounts — never the e2e (native) path.
//
// No migration: username == the lowercased email (username is already UNIQUE),
// the space is generated unique by collision-check + random suffix.

import { SignJWT } from 'jose';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export const MIN_PASSWORD_LEN = 6;
export const MAX_USERNAME_LEN = 50; // story_admin_users.username is VARCHAR(50)

// Owner / family spaces that must NEVER be handed to a public signup, even if a
// generated slug happened to match. The random suffix already prevents this;
// this is belt-and-braces.
const RESERVED_SPACES = new Set(['tredoux', 'bayan', 'riddick']);

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalise + validate an email. Returns the lowercased email or null. */
export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > MAX_USERNAME_LEN) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

/** A short alphanumeric slug from the email's local part (for a readable space prefix). */
function emailSlug(email: string): string {
  const local = email.split('@')[0] || '';
  const slug = local.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return slug || 'coach';
}

/** Crypto-strong base36 random suffix (default 8 chars → ~2.8e12 space). */
function randomSuffix(len = 8): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += (bytes[i] % 36).toString(36);
  return out;
}

/**
 * Generate a UNIQUE space for a new public account. Collision-checked against
 * story_admin_users; the random suffix makes a clash astronomically unlikely
 * and is what guarantees the space is never a reserved (owner/family) one.
 *
 * No DB UNIQUE constraint exists on `space` in v1 (the owner shares 'tredoux'),
 * so this is the uniqueness guarantee. A partial-unique index for public spaces
 * is the Phase-2 hardening. Throws if it can't find a free space (never happens
 * in practice) so the caller fails the signup rather than reusing a space.
 */
export async function generateUniqueSpace(
  supabase: SupabaseClient,
  email: string,
): Promise<string> {
  const slug = emailSlug(email);
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `${slug}-${randomSuffix(attempt < 3 ? 8 : 12)}`;
    if (RESERVED_SPACES.has(candidate)) continue;
    const { data, error } = await supabase
      .from('story_admin_users')
      .select('space')
      .eq('space', candidate)
      .limit(1);
    // On a read error, don't risk reusing a space — try a fresh candidate.
    if (error) continue;
    if (!data || data.length === 0) return candidate;
  }
  throw new Error('Could not allocate a unique space');
}

/**
 * Mint the Story-admin session JWT for a public coach account. Same shape the
 * Sanctuary login/claim use ({ username, role:'admin', space }) so the coach +
 * every space-scoped route work identically — PLUS a `coach_public: true`
 * marker. The marker is a forward hook for guarding the few non-space-scoped
 * admin routes against public tokens (Phase-2 hardening); existing routes
 * ignore unknown claims, so adding it changes nothing today.
 */
export async function mintCoachPublicToken(username: string, space: string): Promise<string> {
  return new SignJWT({ username, role: 'admin', space, coach_public: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJWTSecret());
}

/** Shared httpOnly cookie flags for the story-admin session cookie. */
export function coachSessionCookie(token: string) {
  return {
    name: 'story-admin-token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
    path: '/',
  };
}
