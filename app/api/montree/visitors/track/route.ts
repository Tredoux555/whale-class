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
    let body: { page_url?: string; referrer?: string };
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

    // Geolocation lookup (non-blocking — has 5s timeout built in)
    const location = await getLocationFromIP(ip);

    // Insert into DB
    const supabase = getSupabase();
    const { error } = await supabase.from('montree_visitors').insert({
      ip: ip?.slice(0, 45) || null, // IPv6 max 45 chars
      country: location.country,
      country_code: location.countryCode,
      city: location.city,
      region: location.region,
      timezone: location.timezone,
      page_url: sanitizedPageUrl,
      referrer: sanitizedReferrer,
      user_agent: userAgent,
      fingerprint,
    });

    if (error) {
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
