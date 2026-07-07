// lib/montree/outreach/stamp-attribution.ts
// Stamps a newly-created school with its first-touch acquisition attribution
// from the `montree_attrib` cookie (dropped by VisitorTracker on first visit).
//
// Called fire-and-forget from the signup success paths (principal/register +
// try/instant) — an attribution failure must NEVER block or fail a signup
// (redeem.ts posture). Idempotent-ish: only writes when the row has no
// attrib_source yet, and only when the cookie parses. Migration-safe: swallows
// the 42703 "column does not exist" error until migration 288 runs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { ATTRIB_COOKIE, parseAttribCookie, deriveSource } from '@/lib/montree/attribution';

export async function stampSchoolAttribution(
  supabase: SupabaseClient,
  request: NextRequest,
  schoolId: string
): Promise<void> {
  try {
    if (!schoolId) return;

    const raw = request.cookies.get(ATTRIB_COOKIE)?.value;
    const attrib = parseAttribCookie(raw);
    if (!attrib) return; // no first-touch cookie → nothing to stamp (direct/legacy)

    // Country: cf-ipcountry at signup time is the most reliable geo signal.
    const cf = request.headers.get('cf-ipcountry')?.trim().toUpperCase();
    const country = cf && /^[A-Z]{2}$/.test(cf) ? cf : attrib.country || null;

    // Re-derive source defensively (the cookie's source is authored client-side).
    const source = attrib.source || deriveSource(attrib.utm_source, null);

    const attribUtm = {
      source,
      utm_source: attrib.utm_source ?? null,
      utm_medium: attrib.utm_medium ?? null,
      utm_campaign: attrib.utm_campaign ?? null,
      utm_content: attrib.utm_content ?? null,
      country,
      ts: attrib.ts,
    };

    const { error } = await supabase
      .from('montree_schools')
      .update({
        attrib_source: source,
        attrib_utm: attribUtm,
        attrib_first_touch_at: attrib.ts,
      })
      .eq('id', schoolId)
      // First touch wins: never overwrite an existing stamp.
      .is('attrib_source', null);

    if (error) {
      if (error.code === '42703') return; // migration 288 not run yet — silent
      console.error('[attrib-stamp] update failed:', error.message);
    }
  } catch (err) {
    // Never throw — the caller is a signup success path.
    console.error('[attrib-stamp] threw:', err);
  }
}
