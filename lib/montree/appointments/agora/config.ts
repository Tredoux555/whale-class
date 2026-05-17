// lib/montree/appointments/agora/config.ts
//
// Central reader for Agora env vars. EVERY consumer reads through this
// helper so the "is Agora configured?" check has one source of truth.
//
// REQUIRED ENV (production):
//   AGORA_APP_ID              — Public app identifier (32-char hex).
//   AGORA_APP_CERTIFICATE     — Secret used to sign join tokens (32-char hex).
//   AGORA_CUSTOMER_KEY        — Cloud Recording REST API basic-auth username.
//   AGORA_CUSTOMER_SECRET     — Cloud Recording REST API basic-auth password.
//   AGORA_RECORDING_BUCKET    — Supabase Storage bucket name for uploads.
//                               Defaults to 'meeting-recordings'.
//
// Two-tier configuration check:
//   - isAgoraConfigured() requires only AGORA_APP_ID + AGORA_APP_CERTIFICATE.
//     Sufficient for "Stage A" — native video calls without recording.
//   - getAgoraRecordingConfig() additionally requires AGORA_CUSTOMER_KEY +
//     AGORA_CUSTOMER_SECRET. Required for "Stage B" — Cloud Recording.
// Routes gracefully fall back to "feature not available" when missing,
// rather than crashing. Same opt-in-via-env pattern as Stripe / Resend / OpenAI.

import type { AgoraConfig } from './types';

export function getAgoraConfig(): { configured: boolean; config: AgoraConfig | null } {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const customerKey = process.env.AGORA_CUSTOMER_KEY;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  const recordingBucket = process.env.AGORA_RECORDING_BUCKET || 'meeting-recordings';

  // Token generation needs just appId + appCertificate. Cloud Recording
  // needs all four. We require all four for "fully configured" — if a
  // school wants Agora video calls without recording, that's fine too,
  // but they still need the full setup to opt in cleanly.
  if (!appId || !appCertificate) {
    return { configured: false, config: null };
  }

  return {
    configured: true,
    config: {
      appId,
      appCertificate,
      customerKey: customerKey || '',
      customerSecret: customerSecret || '',
      recordingBucket,
    },
  };
}

/**
 * Strict variant for routes that NEED recording (start/stop endpoints).
 * Returns null when recording-mode env is missing — caller surfaces a
 * 503-style "not configured" response.
 */
export function getAgoraRecordingConfig(): AgoraConfig | null {
  const { configured, config } = getAgoraConfig();
  if (!configured || !config) return null;
  if (!config.customerKey || !config.customerSecret) return null;
  return config;
}

/**
 * Quick boolean for code paths that just want to know "should I offer
 * Agora to this user?" — true when token generation works (recording
 * config not required for the basic call experience).
 */
export function isAgoraConfigured(): boolean {
  return getAgoraConfig().configured;
}
