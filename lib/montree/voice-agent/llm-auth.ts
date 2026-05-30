// lib/montree/voice-agent/llm-auth.ts
//
// Security for the voice LLM shim (/api/montree/admin/voice/llm), which Agora's
// Conversational AI Engine calls from THEIR servers (no Montree session cookie).
//
// Two gates, both fail-closed (everything is inert unless VOICE_LLM_SHARED_SECRET
// is set):
//   1. Bearer: Agora sends llm.api_key as `Authorization: Bearer <secret>`; we
//      require it to equal VOICE_LLM_SHARED_SECRET.
//   2. HMAC scope: the LLM url carries ?sid=<schoolId>&pid=<principalId>&sig=...
//      where sig = HMAC-SHA256(`${sid}.${pid}`, secret). Only our own
//      agent-start (which knows the secret) can authorise a (school, principal)
//      pair — Agora can't forge a different principal.
//
// The shim then mints a short-lived principal token server-side to drive the
// existing authenticated tool path. The shared secret never reaches the LLM.

import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret(): string | null {
  const s = process.env.VOICE_LLM_SHARED_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** True when the shim is configured to run at all. */
export function isVoiceLlmConfigured(): boolean {
  return getSecret() !== null;
}

/** HMAC-SHA256 over `${sid}.${pid}` as lowercase hex. Null if unconfigured. */
export function signVoiceScope(sid: string, pid: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`${sid}.${pid}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function safeEqualUtf8(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

/** Verify the Agora Bearer matches the shared secret. */
export function verifyVoiceLlmBearer(authHeader: string | null): boolean {
  const secret = getSecret();
  if (!secret || !authHeader) return false;
  if (!authHeader.startsWith('Bearer ')) return false;
  return safeEqualUtf8(authHeader.slice(7).trim(), secret);
}

/** Verify the ?sig= matches HMAC(sid.pid). */
export function verifyVoiceScope(
  sid: string,
  pid: string,
  sig: string
): boolean {
  const expected = signVoiceScope(sid, pid);
  if (!expected) return false;
  return safeEqualHex(sig.toLowerCase(), expected);
}

/**
 * Build the absolute LLM callback URL Agora should POST to, with the signed
 * scope. Returns null when unconfigured (caller falls back to the direct
 * Anthropic binding). `origin` must be the PUBLIC origin (Agora is external).
 */
export function buildVoiceLlmUrl(
  origin: string,
  sid: string,
  pid: string
): string | null {
  const sig = signVoiceScope(sid, pid);
  if (!sig) return null;
  const u = new URL('/api/montree/admin/voice/llm', origin);
  u.searchParams.set('sid', sid);
  u.searchParams.set('pid', pid);
  u.searchParams.set('sig', sig);
  return u.toString();
}
