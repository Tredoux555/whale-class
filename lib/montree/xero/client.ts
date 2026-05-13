// lib/montree/xero/client.ts
//
// Phase C — Xero API client wrapper.
//
// Reads OAuth credentials from env (XERO_CLIENT_ID, XERO_CLIENT_SECRET,
// XERO_TENANT_ID, XERO_REFRESH_TOKEN). Tokens are refreshed automatically
// per request — Xero refresh tokens rotate, so we update Railway env vars
// when the rotation happens. For v1 the refresh is best-effort; Phase D
// will add proper token persistence.
//
// 🚨 INACTIVE UNTIL ENV VARS ARE SET. isXeroConfigured() returns false
// when any required var is missing — the sync script + Health card both
// check this and short-circuit gracefully.

interface XeroConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  refreshToken: string;
}

interface XeroTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix epoch seconds
}

export function isXeroConfigured(): boolean {
  return !!(
    process.env.XERO_CLIENT_ID &&
    process.env.XERO_CLIENT_SECRET &&
    process.env.XERO_TENANT_ID &&
    process.env.XERO_REFRESH_TOKEN
  );
}

export function getXeroConfig(): XeroConfig | null {
  if (!isXeroConfigured()) return null;
  return {
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    tenantId: process.env.XERO_TENANT_ID!,
    refreshToken: process.env.XERO_REFRESH_TOKEN!,
  };
}

/**
 * Mint a fresh access token using the refresh token. Xero refresh tokens
 * have a 60-day lifespan and rotate on use — the new refresh_token returned
 * here MUST replace the env var in Railway, otherwise the next sync fails
 * with "invalid_grant".
 *
 * For v1, we just log the new refresh_token loudly so super-admin can update
 * Railway manually. Phase D will store tokens in DB and auto-rotate.
 */
export async function refreshAccessToken(config: XeroConfig): Promise<XeroTokens> {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (data.refresh_token && data.refresh_token !== config.refreshToken) {
    console.warn(
      '[xero] Refresh token rotated. Update XERO_REFRESH_TOKEN in Railway with:',
      data.refresh_token
    );
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 1800),
  };
}

/**
 * Make an authenticated request to the Xero API.
 *
 * `path` should be a Xero API path like `/api.xro/2.0/Invoices`.
 * `body` is JSON-serialised before sending.
 */
export async function xeroFetch(
  config: XeroConfig,
  accessToken: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<unknown> {
  const res = await fetch(`https://api.xero.com${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': config.tenantId,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  // Rate limit handling — Xero allows 60 calls/min and 5,000/day.
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    throw new Error(`Xero rate limit. Retry after ${retryAfter}s`);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero API error (${res.status}): ${body}`);
  }
  return res.json();
}
