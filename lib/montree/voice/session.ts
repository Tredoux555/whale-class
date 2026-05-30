// lib/montree/voice/session.ts
//
// Channel + token helpers for an Astra VOICE session. Reuses the existing
// appointment Agora token-builder (RtcTokenBuilder2) so voice sessions share
// the same App ID / certificate and UID-derivation posture as video calls.
//
// CHANNEL NAMING
//   Deterministic per (school, principal): `astra-voice-<sha256[:20]>`. The
//   same principal always rejoins the same channel, and the agent token is
//   minted for a distinct UID so it never collides with the human.

import { createHash } from 'node:crypto';
import { buildJoinToken } from '@/lib/montree/appointments/agora/token-builder';
import type { AgoraJoinToken } from '@/lib/montree/appointments/agora/types';

const VOICE_CHANNEL_PREFIX = 'astra-voice-';

/** Stable channel name for a principal's private Astra voice session. */
export function voiceChannelForPrincipal(
  schoolId: string,
  principalId: string
): string {
  const h = createHash('sha256')
    .update(`${schoolId}:${principalId}`)
    .digest('hex');
  return `${VOICE_CHANNEL_PREFIX}${h.slice(0, 20)}`;
}

/** Publish-side token for the human principal joining their voice channel. */
export function mintPrincipalVoiceToken(
  schoolId: string,
  principalId: string
): AgoraJoinToken | null {
  const channel = voiceChannelForPrincipal(schoolId, principalId);
  return buildJoinToken({
    channel,
    role: 'principal-voice',
    identityId: principalId,
  });
}

/** Token for the Astra agent itself to join the same channel (distinct UID). */
export function mintAgentVoiceToken(
  schoolId: string,
  principalId: string
): AgoraJoinToken | null {
  const channel = voiceChannelForPrincipal(schoolId, principalId);
  return buildJoinToken({
    channel,
    role: 'astra-agent',
    identityId: `agent:${principalId}`,
  });
}
