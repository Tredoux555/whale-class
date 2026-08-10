/**
 * POST /api/montree/visitors/track
 * Lightweight visitor tracking endpoint — fires on every page load.
 * Captures IP → geolocation, page URL, referrer, user agent.
 * No auth required (public tracking pixel).
 * Rate limited by fingerprint to prevent spam.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getClientIP, getLocationFromIP } from '@/lib/ip-geolocation';
import { sanitizeUtm } from '@/lib/montree/attribution';
import { createHash } from 'crypto';

// In-memory rate limit: max 1 track per fingerprint per 30 seconds
const recentTracks = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;
const MAX_RATE_LIMIT_ENTRIES = 10_000; // Global cap to prevent memory leak

// Evict stale entries every 100th request + enforce global cap
let requestCount = 0;
function evictStale() {
  requestCount++;
  if (requestCount % 100 === 0 || recentTracks.size > MAX_RATE_LIMIT_ENTRIES) {
    const now = Date.now();
    for (const [key, ts] of recentTracks) {
      if (now - ts > RATE_LIMIT_MS * 2) {
        recentTracks.delete(key);
      }
    }
    // If still over limit after eviction, clear oldest half
    if (recentTracks.size > MAX_RATE_LIMIT_ENTRIES) {
      const entries = Array.from(recentTracks.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      for (const [key] of toRemove) {
        recentTracks.delete(key);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    evictStale();

    // Extract IP
    const ip = getClientIP(request);

    // Parse body
    let body: {
      page_url?: string;
      referrer?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      is_internal?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const pageUrl = body.page_url;
    if (!pageUrl || typeof pageUrl !== 'string') {
      return NextResponse.json({ error: 'page_url required' }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedPageUrl = pageUrl.slice(0, 2048);
    const sanitizedReferrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 2048) : null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 1024) || null;

    // Generate fingerprint (hash of IP + user agent) for grouping sessions
    const fingerprintRaw = `${ip || 'unknown'}|${userAgent || 'unknown'}`;
    const fingerprint = createHash('sha256').update(fingerprintRaw).digest('hex').slice(0, 16);

    // Rate limit check
    const lastTrack = recentTracks.get(fingerprint);
    if (lastTrack && Date.now() - lastTrack < RATE_LIMIT_MS) {
      // Silently accept but don't store — no error to avoid client retries
      return NextResponse.json({ ok: true });
    }
    recentTracks.set(fingerprint, Date.now());

    // Skip bots — comprehensive regex
    if (userAgent && /bot|crawl|spider|slurp|mediapartners|adsbot|googlebot|bingbot|yandex|baidu|duckduck|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claude|anthropic|headless|phantom|selenium|puppeteer|playwright|wget|curl|python-requests|httpx|axios|node-fetch|go-http/i.test(userAgent)) {
      return NextResponse.json({ ok: true });
    }

    // Geolocation lookup (non-blocking — has 5s timeout built in).
    // Cloudflare fronts the app, so cf-ipcountry is authoritative + free — prefer
    // it for country/code; ip-api still supplies city/region/timezone detail.
    const location = await getLocationFromIP(ip);
    const cfCountryCode = request.headers.get('cf-ipcountry')?.trim().toUpperCase() || null;
    const validCf = cfCountryCode && /^[A-Z]{2}$/.test(cfCountryCode) ? cfCountryCode : null;
    const countryCode = validCf || location.countryCode;
    // If cf gave us a code ip-api didn't, still surface a country label from cf.
    const country = location.country || (validCf ? validCf : null);

    // UTM capture (Jul 7 2026 — ad-geo attribution).
    const utmSource = sanitizeUtm(body.utm_source) ?? null;
    const utmMedium = sanitizeUtm(body.utm_medium) ?? null;
    const utmCampaign = sanitizeUtm(body.utm_campaign) ?? null;
    const utmContent = sanitizeUtm(body.utm_content) ?? null;

    // Whether THIS browser has been flagged internal (Tredoux's own device —
    // migration 324 `is_internal` toggle, VisitorTracker.tsx reads a
    // localStorage flag and sends it here). Only a boolean true is honored;
    // anything else defaults to false, matching the column default.
    const isInternal = body.is_internal === true;

    // Insert into DB.
    // 🚨 FIXED — this used to discard the real page_url entirely (it only
    // ever landed in `referrer`, and only as a fallback when there was no
    // real referrer), so every row displayed as page "/" and real
    // navigation/funnel behavior was invisible. `page_url` was added by
    // migration 163 and is now stored on every row; `referrer` holds only
    // the actual document.referrer (or null) again.
    // NOTE: IP still goes into `isp` (unchanged) — that column-naming quirk
    // is tracked separately (docs/OUTREACH_AUDIT.md F-7.9) and is out of
    // scope here; renaming it needs its own migration + backfill.
    // utm_* columns come from migration 288; is_internal from migration 324.
    // If a migration hasn't run yet the insert fails on the unknown columns
    // and we retry with progressively fewer new columns so tracking never
    // breaks pre-migration.
    const supabase = getSupabase();
    const baseRow = {
      isp: ip?.slice(0, 45) || null,
      country,
      country_code: countryCode,
      city: location.city,
      region: location.region,
      timezone: location.timezone,
      page_url: sanitizedPageUrl,
      referrer: sanitizedReferrer,
      user_agent: userAgent,
      fingerprint,
    };
    const legacyRow = {
      isp: baseRow.isp,
      country,
      country_code: countryCode,
      city: location.city,
      region: location.region,
      timezone: location.timezone,
      referrer: sanitizedReferrer || sanitizedPageUrl,
      user_agent: userAgent,
      fingerprint,
    };
    const utmRow = {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
    };

    const { error } = await supabase
      .from('montree_visitors')
      .insert({ ...baseRow, ...utmRow, is_internal: isInternal });

    if (error && error.code === '42703') {
      // 42703 = undefined_column. Try progressively fewer of the newer
      // columns: drop is_internal (migration 324) → drop utm_* (migration
      // 288) → drop page_url too (migration 163, the original schema-drift
      // fallback shape) — so tracking never breaks pre-migration.
      const { error: retry1 } = await supabase.from('montree_visitors').insert({ ...baseRow, ...utmRow });
      if (retry1?.code === '42703') {
        const { error: retry2 } = await supabase.from('montree_visitors').insert(baseRow);
        if (retry2?.code === '42703') {
          const { error: retry3 } = await supabase.from('montree_visitors').insert(legacyRow);
          if (retry3) {
            console.error('[VISITOR-TRACK] DB insert error (legacy retry):', retry3.code);
          }
        } else if (retry2) {
          console.error('[VISITOR-TRACK] DB insert error (no-utm/no-internal retry):', retry2.code);
        }
      } else if (retry1) {
        console.error('[VISITOR-TRACK] DB insert error (no-internal retry):', retry1.code);
      }
    } else if (error) {
      console.error('[VISITOR-TRACK] DB insert error:', error.code);
      // Don't expose error to client
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[VISITOR-TRACK] Unexpected error:', error instanceof Error ? error.message : 'Unknown');
    // Always return 200 — tracking should never show errors to visitors
    return NextResponse.json({ ok: true });
  }
}
