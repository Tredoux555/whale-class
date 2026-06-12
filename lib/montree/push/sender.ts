// lib/montree/push/sender.ts
// App Store build (Jun 2026): server-side push notification sender.
//
// Architecture (matches the thin-wrapper mobile app):
//   - Android devices register an FCM token  → sent via Firebase Cloud
//     Messaging HTTP v1 (env: FIREBASE_SERVICE_ACCOUNT).
//   - iOS devices register a raw APNs token  → sent directly to APNs over
//     HTTP/2 with an ES256-signed provider JWT (env: APNS_AUTH_KEY,
//     APNS_KEY_ID, APNS_TEAM_ID). No Firebase iOS SDK needed in the app.
//
// Design rules (lessons from the Jun 2026 functionality audit — silent
// failure is the recurring villain):
//   - NEVER throws: push is best-effort decoration on top of email/in-app.
//   - But never SILENT either: every failure is logged with context, and
//     callers get honest counts back.
//   - Unconfigured environments no-op with a single startup-style log line,
//     so local dev and web-only deploys are unaffected.
//   - Dead tokens (APNs 410/BadDeviceToken, FCM UNREGISTERED) are marked
//     failed_at so we stop pushing to them.
//
// Requires migration 251_push_device_tokens.sql.

import { createSign, sign as cryptoSign } from 'crypto';
import { connect as http2Connect } from 'http2';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  /** Optional extra data. `url` is treated as an in-app deep link path. */
  data?: Record<string, string>;
}

export interface PushOwner {
  type: 'teacher' | 'principal' | 'parent';
  id: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  /** true when neither FCM nor APNs is configured (nothing attempted) */
  skipped: boolean;
}

const b64url = (input: Buffer | string): string =>
  (typeof input === 'string' ? Buffer.from(input) : input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// ---------------------------------------------------------------------------
// FCM (Android)
// ---------------------------------------------------------------------------

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedServiceAccount: ServiceAccount | null | undefined;
let fcmAccessToken: { token: string; expiresAt: number } | null = null;
let warnedUnconfigured = false;

function getServiceAccount(): ServiceAccount | null {
  if (cachedServiceAccount !== undefined) return cachedServiceAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    cachedServiceAccount = null;
    return null;
  }
  try {
    // Accept raw JSON or base64-encoded JSON (easier to paste into Railway).
    const json = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      console.error('[push] FIREBASE_SERVICE_ACCOUNT missing required fields');
      cachedServiceAccount = null;
      return null;
    }
    cachedServiceAccount = parsed as ServiceAccount;
  } catch (e) {
    console.error('[push] FIREBASE_SERVICE_ACCOUNT is not valid JSON/base64:', e);
    cachedServiceAccount = null;
  }
  return cachedServiceAccount;
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (fcmAccessToken && fcmAccessToken.expiresAt > Date.now() + 60_000) {
    return fcmAccessToken.token;
  }
  try {
    const iat = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat,
        exp: iat + 3600,
      })
    );
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      console.error('[push] FCM OAuth token exchange failed:', res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token: string; expires_in: number };
    fcmAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return fcmAccessToken.token;
  } catch (e) {
    console.error('[push] FCM OAuth error:', e);
    return null;
  }
}

/** @returns 'sent' | 'dead' (token should be retired) | 'failed' */
async function sendFcm(token: string, payload: PushPayload): Promise<'sent' | 'dead' | 'failed'> {
  const sa = getServiceAccount();
  if (!sa) return 'failed';
  const accessToken = await getFcmAccessToken(sa);
  if (!accessToken) return 'failed';

  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data || {},
            android: { priority: 'HIGH' },
          },
        }),
      }
    );
    if (res.ok) return 'sent';
    const text = await res.text();
    if (res.status === 404 || text.includes('UNREGISTERED') || text.includes('INVALID_ARGUMENT')) {
      return 'dead';
    }
    console.error('[push] FCM send failed:', res.status, text.slice(0, 300));
    return 'failed';
  } catch (e) {
    console.error('[push] FCM send error:', e);
    return 'failed';
  }
}

// ---------------------------------------------------------------------------
// APNs (iOS) — direct over HTTP/2 (node:http2; undici fetch can't do h2)
// ---------------------------------------------------------------------------

interface ApnsConfig {
  key: string; // .p8 PEM
  keyId: string;
  teamId: string;
  bundleId: string;
  host: string;
}

let cachedApns: ApnsConfig | null | undefined;
let apnsJwt: { token: string; issuedAt: number } | null = null;

function getApnsConfig(): ApnsConfig | null {
  if (cachedApns !== undefined) return cachedApns;
  const key = process.env.APNS_AUTH_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  if (!key || !keyId || !teamId) {
    cachedApns = null;
    return null;
  }
  cachedApns = {
    // Railway env vars flatten newlines; accept both real and \n-escaped PEM.
    key: key.includes('\\n') ? key.replace(/\\n/g, '\n') : key,
    keyId,
    teamId,
    bundleId: process.env.APNS_BUNDLE_ID || 'xyz.montree.app',
    host:
      (process.env.APNS_ENV || 'production') === 'sandbox'
        ? 'https://api.sandbox.push.apple.com'
        : 'https://api.push.apple.com',
  };
  return cachedApns;
}

function getApnsJwt(cfg: ApnsConfig): string | null {
  // Apple: refresh between 20 and 60 minutes. Reuse for 40.
  if (apnsJwt && Date.now() - apnsJwt.issuedAt < 40 * 60_000) return apnsJwt.token;
  try {
    const header = b64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId }));
    const claims = b64url(
      JSON.stringify({ iss: cfg.teamId, iat: Math.floor(Date.now() / 1000) })
    );
    const signature = cryptoSign('sha256', Buffer.from(`${header}.${claims}`), {
      key: cfg.key,
      dsaEncoding: 'ieee-p1363',
    });
    apnsJwt = { token: `${header}.${claims}.${b64url(signature)}`, issuedAt: Date.now() };
    return apnsJwt.token;
  } catch (e) {
    console.error('[push] APNs JWT signing failed (check APNS_AUTH_KEY format):', e);
    return null;
  }
}

/** @returns 'sent' | 'dead' | 'failed' */
function sendApns(token: string, payload: PushPayload): Promise<'sent' | 'dead' | 'failed'> {
  const cfg = getApnsConfig();
  if (!cfg) return Promise.resolve('failed');
  const jwt = getApnsJwt(cfg);
  if (!jwt) return Promise.resolve('failed');

  return new Promise((resolve) => {
    try {
      const client = http2Connect(cfg.host);
      const timer = setTimeout(() => {
        client.close();
        console.error('[push] APNs request timed out');
        resolve('failed');
      }, 10_000);

      client.on('error', (e) => {
        clearTimeout(timer);
        console.error('[push] APNs connection error:', e.message);
        resolve('failed');
      });

      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': cfg.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      });

      let status = 0;
      let bodyText = '';
      req.on('response', (headers) => {
        status = Number(headers[':status'] || 0);
      });
      req.on('data', (chunk) => (bodyText += chunk));
      req.on('end', () => {
        clearTimeout(timer);
        client.close();
        if (status === 200) return resolve('sent');
        if (status === 410 || bodyText.includes('BadDeviceToken') || bodyText.includes('Unregistered')) {
          return resolve('dead');
        }
        console.error('[push] APNs send failed:', status, bodyText.slice(0, 300));
        resolve('failed');
      });
      req.on('error', (e) => {
        clearTimeout(timer);
        client.close();
        console.error('[push] APNs stream error:', e.message);
        resolve('failed');
      });

      req.end(
        JSON.stringify({
          aps: {
            alert: { title: payload.title, body: payload.body },
            sound: 'default',
          },
          ...(payload.data || {}),
        })
      );
    } catch (e) {
      console.error('[push] APNs unexpected error:', e);
      resolve('failed');
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function isPushConfigured(): { ios: boolean; android: boolean } {
  return { ios: !!getApnsConfig(), android: !!getServiceAccount() };
}

/**
 * Send a push notification to every live device of the given owners.
 * Never throws. Dead tokens are marked failed_at so they're skipped next time.
 */
export async function sendPushToOwners(
  supabase: SupabaseClient,
  owners: PushOwner[],
  payload: PushPayload
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, skipped: false };
  if (!owners.length) return result;

  const configured = isPushConfigured();
  if (!configured.ios && !configured.android) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.log(
        '[push] not configured (set FIREBASE_SERVICE_ACCOUNT and/or APNS_AUTH_KEY+APNS_KEY_ID+APNS_TEAM_ID) — push disabled'
      );
    }
    result.skipped = true;
    return result;
  }

  try {
    // Tokens are unique per device; query per owner_type to use the index.
    const byType = new Map<string, string[]>();
    for (const o of owners) {
      if (!o?.id) continue;
      const list = byType.get(o.type) || [];
      list.push(o.id);
      byType.set(o.type, list);
    }

    const rows: Array<{ id: string; token: string; platform: 'ios' | 'android' }> = [];
    for (const [ownerType, ids] of byType) {
      const { data, error } = await supabase
        .from('montree_device_tokens')
        .select('id, token, platform')
        .eq('owner_type', ownerType)
        .in('owner_id', [...new Set(ids)])
        .is('failed_at', null);
      if (error) {
        console.error('[push] token lookup failed:', error.message);
        continue;
      }
      rows.push(...((data || []) as typeof rows));
    }
    if (!rows.length) return result;

    const deadTokenIds: string[] = [];
    // Small batches; typical fan-out here is < 50 devices.
    const BATCH = 10;
    for (let i = 0; i < rows.length; i += BATCH) {
      const outcomes = await Promise.all(
        rows.slice(i, i + BATCH).map(async (row) => {
          const outcome =
            row.platform === 'android'
              ? configured.android
                ? await sendFcm(row.token, payload)
                : ('failed' as const)
              : configured.ios
                ? await sendApns(row.token, payload)
                : ('failed' as const);
          return { row, outcome };
        })
      );
      for (const { row, outcome } of outcomes) {
        if (outcome === 'sent') result.sent++;
        else {
          result.failed++;
          if (outcome === 'dead') deadTokenIds.push(row.id);
        }
      }
    }

    if (deadTokenIds.length) {
      await supabase
        .from('montree_device_tokens')
        .update({ failed_at: new Date().toISOString() })
        .in('id', deadTokenIds);
      console.log(`[push] retired ${deadTokenIds.length} dead device token(s)`);
    }
  } catch (e) {
    // Push must never break the calling route.
    console.error('[push] sendPushToOwners unexpected error:', e);
  }
  return result;
}

/**
 * Push to the parents of the given children. Mirrors the email-side lookup
 * in lib/montree/parent-emails.ts: montree_parent_children → montree_parents,
 * respecting can_view_reports (when requireViewReports) and is_active.
 */
export async function pushToParentsOfChildren(
  supabase: SupabaseClient,
  childIds: string[],
  payload: PushPayload,
  opts: { requireViewReports?: boolean } = {}
): Promise<PushResult> {
  const empty: PushResult = { sent: 0, failed: 0, skipped: false };
  if (!childIds.length) return empty;
  try {
    const { data: links, error } = await supabase
      .from('montree_parent_children')
      .select('parent_id, can_view_reports')
      .in('child_id', childIds);
    if (error) {
      console.error('[push] parent link lookup failed:', error.message);
      return empty;
    }
    const eligible = (links || []).filter(
      (l: { parent_id: string | null; can_view_reports: boolean | null }) =>
        l.parent_id && (!opts.requireViewReports || l.can_view_reports !== false)
    );
    const parentIds = [...new Set(eligible.map((l: { parent_id: string | null }) => l.parent_id as string))];
    if (!parentIds.length) return empty;

    const { data: parents, error: pErr } = await supabase
      .from('montree_parents')
      .select('id, is_active')
      .in('id', parentIds);
    if (pErr) {
      console.error('[push] parent lookup failed:', pErr.message);
      return empty;
    }
    const active = (parents || []).filter(
      (p: { id: string; is_active: boolean | null }) => p.is_active !== false
    );
    return sendPushToOwners(
      supabase,
      active.map((p: { id: string }) => ({ type: 'parent' as const, id: p.id })),
      payload
    );
  } catch (e) {
    console.error('[push] pushToParentsOfChildren unexpected error:', e);
    return empty;
  }
}
