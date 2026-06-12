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
// Requires migration 251_push_device_tokens.sql. Migration 255 adds the
// durable retry queue (montree_push_outbox, drained via ./outbox.ts) and
// per-parent notification preferences (montree_parents.notification_prefs,
// enforced once in sendPushToOwners) — both degrade gracefully until run.

import { createSign, sign as cryptoSign } from 'crypto';
import { connect as http2Connect, constants as http2Constants } from 'http2';
import type { ClientHttp2Session } from 'http2';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload {
  title: string;
  body: string;
  /** Optional extra data. `url` is treated as an in-app deep link path. */
  data?: Record<string, string>;
}

/**
 * Outcome of a single-device send:
 *   'sent'   — delivered to APNs/FCM.
 *   'dead'   — the TOKEN is gone (APNs 410 / FCM UNREGISTERED); retire it,
 *              never retry it.
 *   'retry'  — transient failure (network, 5xx, 429); worth a durable retry
 *              via montree_push_outbox (lib/montree/push/outbox.ts).
 *   'failed' — permanent/config failure (bad payload, unconfigured); drop.
 */
export type SendOutcome = 'sent' | 'dead' | 'retry' | 'failed';

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

async function sendFcm(token: string, payload: PushPayload): Promise<SendOutcome> {
  const sa = getServiceAccount();
  if (!sa) return 'failed';
  const accessToken = await getFcmAccessToken(sa);
  // OAuth exchange failures are usually transient (network / Google 5xx).
  if (!accessToken) return 'retry';

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
    // Audit-fix (Jun 2026 review): retire ONLY on definitive token-gone
    // signals. INVALID_ARGUMENT alone can mean a malformed PAYLOAD — one
    // payload bug must not mark the whole Android fleet dead.
    if (res.status === 404 || text.includes('UNREGISTERED')) {
      return 'dead';
    }
    console.error('[push] FCM send failed:', res.status, text.slice(0, 300));
    // 429 and 5xx are transient per the FCM error contract; 4xx payload
    // problems are permanent (retrying the same payload changes nothing).
    return res.status === 429 || res.status >= 500 ? 'retry' : 'failed';
  } catch (e) {
    // fetch() rejection = network-level trouble — transient by definition.
    console.error('[push] FCM send error:', e);
    return 'retry';
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

// --- Shared HTTP/2 session (Jun 12 polish — deferred audit finding) ---------
// The first cut opened one TLS+h2 connection PER TOKEN send. APNs explicitly
// supports (and prefers) long-lived connections, so we keep ONE lazily-created
// module-level session and multiplex every request over it:
//   - recreated on 'error' / 'close' / GOAWAY (Apple's "please reconnect"),
//   - closed after 60s of no sends so a quiet deploy never leaks a socket,
//   - each request keeps its own 10s timeout that cancels only ITS stream —
//     a slow push never tears down the connection for the rest of the batch.

const APNS_IDLE_MS = 60_000;
const APNS_REQUEST_TIMEOUT_MS = 10_000;

let apnsSession: ClientHttp2Session | null = null;
let apnsSessionHost = '';
let apnsIdleTimer: ReturnType<typeof setTimeout> | null = null;

function dropApnsSession(session: ClientHttp2Session): void {
  if (apnsSession !== session) return;
  apnsSession = null;
  if (apnsIdleTimer) {
    clearTimeout(apnsIdleTimer);
    apnsIdleTimer = null;
  }
}

function getApnsSession(host: string): ClientHttp2Session {
  if (
    apnsSession &&
    apnsSessionHost === host &&
    !apnsSession.closed &&
    !apnsSession.destroyed
  ) {
    return apnsSession;
  }
  if (apnsSession && !apnsSession.destroyed) {
    const stale = apnsSession;
    try {
      stale.close();
    } catch {
      /* already closing */
    }
  }
  const session = http2Connect(host);
  apnsSession = session;
  apnsSessionHost = host;
  // On any terminal session event, forget the session so the next send
  // reconnects. In-flight streams are destroyed by node with their own
  // 'error', so every pending sendApns resolves through its stream handlers.
  session.on('error', (e) => {
    console.error('[push] APNs session error:', (e as Error).message);
    dropApnsSession(session);
  });
  session.on('close', () => dropApnsSession(session));
  session.on('goaway', () => {
    dropApnsSession(session);
    try {
      session.close();
    } catch {
      /* best-effort */
    }
  });
  return session;
}

/** Re-arm the idle shutdown after each send; never keeps the process alive. */
function touchApnsIdleTimer(): void {
  if (apnsIdleTimer) clearTimeout(apnsIdleTimer);
  apnsIdleTimer = setTimeout(() => {
    apnsIdleTimer = null;
    if (apnsSession && !apnsSession.destroyed) {
      try {
        apnsSession.close();
      } catch {
        /* best-effort */
      }
    }
    apnsSession = null;
  }, APNS_IDLE_MS);
  apnsIdleTimer.unref?.();
}

function sendApns(token: string, payload: PushPayload): Promise<SendOutcome> {
  const cfg = getApnsConfig();
  if (!cfg) return Promise.resolve('failed');
  const jwt = getApnsJwt(cfg);
  if (!jwt) return Promise.resolve('failed');

  return new Promise((resolve) => {
    let settled = false;
    const settle = (outcome: SendOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    try {
      const session = getApnsSession(cfg.host);
      touchApnsIdleTimer();

      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': cfg.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      });

      // Per-request timeout: cancel ONLY this stream — the shared session
      // stays up for everything else in flight.
      const timer = setTimeout(() => {
        console.error('[push] APNs request timed out');
        try {
          req.close(http2Constants.NGHTTP2_CANCEL);
        } catch {
          /* best-effort */
        }
        settle('retry');
      }, APNS_REQUEST_TIMEOUT_MS);

      let status = 0;
      let bodyText = '';
      req.on('response', (headers) => {
        status = Number(headers[':status'] || 0);
      });
      req.on('data', (chunk) => (bodyText += chunk));
      req.on('end', () => {
        clearTimeout(timer);
        touchApnsIdleTimer();
        if (status === 200) return settle('sent');
        if (status === 410 || bodyText.includes('BadDeviceToken') || bodyText.includes('Unregistered')) {
          return settle('dead');
        }
        console.error('[push] APNs send failed:', status, bodyText.slice(0, 300));
        // 429 (TooManyRequests) + 5xx are transient per Apple's docs; other
        // 4xx (bad payload, bad auth) won't improve by retrying the same send.
        settle(status === 429 || status >= 500 || status === 0 ? 'retry' : 'failed');
      });
      req.on('error', (e) => {
        // Stream errors include session-level teardown — connection trouble,
        // not a verdict on the token/payload. Durable retry is worth it.
        clearTimeout(timer);
        console.error('[push] APNs stream error:', (e as Error).message);
        settle('retry');
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
      settle('retry');
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
 * Low-level single-device send. Shared by the live batch below and by the
 * durable-retry drain (lib/montree/push/outbox.ts) so both paths classify
 * outcomes identically.
 */
export async function sendToDeviceToken(
  platform: 'ios' | 'android',
  token: string,
  payload: PushPayload
): Promise<SendOutcome> {
  const configured = isPushConfigured();
  if (platform === 'android') {
    return configured.android ? sendFcm(token, payload) : 'failed';
  }
  return configured.ios ? sendApns(token, payload) : 'failed';
}

// ---------------------------------------------------------------------------
// Per-parent notification preferences (migration 255) — THE chokepoint.
// Every push path in the app (3 report-send routes, thread messages both
// directions, broadcasts) funnels through sendPushToOwners(), so prefs are
// enforced exactly once, here, instead of per call site.
// ---------------------------------------------------------------------------

type PrefCategory = 'reports' | 'messages' | 'broadcasts';

// Call sites already tag every payload with data.type — map it to a pref key.
const PREF_CATEGORY_BY_PAYLOAD_TYPE: Record<string, PrefCategory> = {
  report: 'reports',
  message: 'messages',
  broadcast: 'broadcasts',
};

let warnedPrefsMigrationPending = false;

/**
 * Drop parents who opted out of this payload's category.
 * Opt-OUT model: absent key (or '{}') = enabled; only an explicit `false`
 * blocks. Parents only — staff have no prefs (yet).
 * Degrades gracefully: if migration 255 hasn't run (missing column/table) or
 * the lookup fails, everyone is kept — a prefs hiccup must never mute pushes.
 */
async function filterOwnersByParentPrefs(
  supabase: SupabaseClient,
  owners: PushOwner[],
  payload: PushPayload
): Promise<PushOwner[]> {
  const category = PREF_CATEGORY_BY_PAYLOAD_TYPE[payload.data?.type || ''];
  if (!category) return owners;
  const parentIds = [
    ...new Set(owners.filter((o) => o?.type === 'parent' && o.id).map((o) => o.id)),
  ];
  if (!parentIds.length) return owners;
  try {
    const { data, error } = await supabase
      .from('montree_parents')
      .select('id, notification_prefs')
      .in('id', parentIds);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '42703' || code === '42P01') {
        if (!warnedPrefsMigrationPending) {
          warnedPrefsMigrationPending = true;
          console.warn(
            '[push] notification_prefs missing — run migrations/255_push_outbox_and_prefs.sql ' +
              '(parent notification preferences not enforced until then)'
          );
        }
      } else {
        console.error('[push] prefs lookup failed (sending to all):', error.message);
      }
      return owners;
    }
    const optedOut = new Set(
      ((data || []) as Array<{ id: string; notification_prefs: Record<string, unknown> | null }>)
        .filter((p) => p.notification_prefs?.[category] === false)
        .map((p) => p.id)
    );
    if (!optedOut.size) return owners;
    return owners.filter((o) => o?.type !== 'parent' || !optedOut.has(o.id));
  } catch (e) {
    console.error('[push] prefs filter unexpected error (sending to all):', e);
    return owners;
  }
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
    // Durable-retry drain (migration 255): opportunistically flush previously
    // failed sends at the start of every batch. There is no cron
    // infrastructure yet — when one exists, a cron route can call
    // drainPushOutbox() directly instead. Fire-and-forget by design.
    try {
      const { drainPushOutbox } = await import('./outbox');
      void drainPushOutbox(supabase);
    } catch (e) {
      console.error('[push] outbox drain dispatch failed:', e);
    }

    // Per-parent notification preferences — the single enforcement point.
    const allowedOwners = await filterOwnersByParentPrefs(supabase, owners, payload);
    if (!allowedOwners.length) return result;

    // Tokens are unique per device; query per owner_type to use the index.
    const byType = new Map<string, string[]>();
    for (const o of allowedOwners) {
      if (!o?.id) continue;
      const list = byType.get(o.type) || [];
      list.push(o.id);
      byType.set(o.type, list);
    }

    const rows: Array<{
      id: string;
      token: string;
      platform: 'ios' | 'android';
      owner_type: 'teacher' | 'principal' | 'parent';
      owner_id: string;
    }> = [];
    for (const [ownerType, ids] of byType) {
      const { data, error } = await supabase
        .from('montree_device_tokens')
        .select('id, token, platform, owner_type, owner_id')
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
    const retryRows: typeof rows = [];
    // Small batches; typical fan-out here is < 50 devices.
    const BATCH = 10;
    for (let i = 0; i < rows.length; i += BATCH) {
      const outcomes = await Promise.all(
        rows.slice(i, i + BATCH).map(async (row) => ({
          row,
          outcome: await sendToDeviceToken(row.platform, row.token, payload),
        }))
      );
      for (const { row, outcome } of outcomes) {
        if (outcome === 'sent') result.sent++;
        else {
          result.failed++;
          if (outcome === 'dead') deadTokenIds.push(row.id);
          // Transient failures go to the durable queue; 'dead' and permanent
          // 'failed' never do (retrying them is pointless by definition).
          else if (outcome === 'retry') retryRows.push(row);
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

    if (retryRows.length) {
      try {
        const { enqueuePushRetries } = await import('./outbox');
        await enqueuePushRetries(
          supabase,
          retryRows.map((r) => ({
            tokenRowId: r.id,
            token: r.token,
            platform: r.platform,
            ownerType: r.owner_type,
            ownerId: r.owner_id,
          })),
          payload
        );
      } catch (e) {
        console.error('[push] retry enqueue dispatch failed:', e);
      }
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
