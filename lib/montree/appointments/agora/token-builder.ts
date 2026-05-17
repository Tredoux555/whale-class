// lib/montree/appointments/agora/token-builder.ts
//
// Wraps the `agora-token` npm package (RtcTokenBuilder2) into a small
// helper that mints publish-side join tokens for staff + parents.
//
// CHANNEL NAMING:
//   Deterministic from appointment ical_token, same anti-collision posture
//   as the Jitsi room name from Phase 116.2 (architectural rule #164).
//   Format: `montree-<first-20-chars-of-ical_token>`. Same per-appointment
//   so reschedules keep the same room.
//
// UID ASSIGNMENT:
//   Agora UIDs are 32-bit unsigned ints. We derive deterministically from
//   the (role + identityId) pair so the same user always gets the same
//   UID inside the same channel. Means: refreshing the page, getting a
//   new token mid-call, etc. all produce the same UID — Agora treats it
//   as a token renewal, not a new participant.
//
// TOKEN TTL:
//   1 hour. Generous (typical meetings are 15-60 min). Clients refresh
//   via the same /agora-token endpoint when the token's about to expire
//   (Agora's `token-privilege-will-expire` event fires 30s prior).

import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { createHash } from 'node:crypto';
import { getAgoraConfig } from './config';
import type { AgoraJoinToken } from './types';

const TOKEN_TTL_SECONDS = 3600; // 1 hour
const CHANNEL_PREFIX = 'montree-';
const CHANNEL_TOKEN_SLICE = 20; // 20 chars of base64url ≈ 120 bits entropy

/**
 * Derive the canonical Agora channel name from an appointment's ical_token.
 * Returns null when the token is missing or too short — caller surfaces a
 * "video call not available" state.
 */
export function channelForAppointment(icalToken: string | null | undefined): string | null {
  if (!icalToken) return null;
  // Defensive strip — base64url is already safe but belt-and-braces.
  const safe = icalToken.replace(/[^A-Za-z0-9_-]/g, '');
  if (safe.length < CHANNEL_TOKEN_SLICE) return null;
  return `${CHANNEL_PREFIX}${safe.slice(0, CHANNEL_TOKEN_SLICE)}`;
}

/**
 * Map a (role, identityId) pair to a stable Agora UID in [1, 2^31-1].
 *
 * Why [1, 2^31-1]: Agora's docs say uid=0 means "let the server assign"
 * — we always want a deterministic UID, so we avoid 0. The upper bound
 * is the 32-bit signed range; the SDK accepts unsigned but most consumer
 * platforms treat as signed.
 */
export function deriveAgoraUid(role: string, identityId: string): number {
  const hash = createHash('sha256').update(`${role}:${identityId}`).digest();
  // Take the first 4 bytes as a uint32, then clamp into [1, 2^31-1].
  const u32 = hash.readUInt32BE(0);
  const clamped = u32 % 0x7fff_ffff; // 0 to 2^31-2
  return clamped === 0 ? 1 : clamped;
}

/**
 * Build a publish-side join token for a participant.
 *
 * `role` and `identityId` together produce a deterministic UID. Both
 * staff (teacher/principal) and parents publish — Agora's permission
 * model doesn't need different role kinds for our 2-party meeting use
 * case (we'd switch to subscriber-only roles for broadcast-style events).
 *
 * Returns null when Agora isn't configured — route callers should map
 * that to a 503 / 'not enabled' response.
 */
export function buildJoinToken(args: {
  channel: string;
  role: string; // 'teacher' | 'principal' | 'parent'
  identityId: string;
}): AgoraJoinToken | null {
  const { configured, config } = getAgoraConfig();
  if (!configured || !config) return null;

  const uid = deriveAgoraUid(args.role, args.identityId);
  const nowSec = Math.floor(Date.now() / 1000);
  const expireSec = nowSec + TOKEN_TTL_SECONDS;
  const token = RtcTokenBuilder.buildTokenWithUid(
    config.appId,
    config.appCertificate,
    args.channel,
    uid,
    RtcRole.PUBLISHER,
    // privilegeExpireSec — overall token lifetime
    expireSec,
    // tokenExpireSec — when the token itself stops being accepted
    expireSec
  );

  return {
    appId: config.appId,
    channel: args.channel,
    uid,
    token,
    expiresAt: expireSec,
  };
}

/**
 * Build a recording-bot token. Agora Cloud Recording needs its own UID
 * to "join" the channel as an invisible participant that captures the
 * mix. Recording UID derived from channel name so each appointment has
 * a stable recording-bot identity.
 */
export function buildRecordingToken(channel: string): AgoraJoinToken | null {
  // Use a fixed prefix so recording UIDs never collide with participant
  // UIDs (participants are hashed from role:userId; recording bots are
  // hashed from 'recording-bot':channel).
  return buildJoinToken({
    channel,
    role: 'recording-bot',
    identityId: channel,
  });
}
