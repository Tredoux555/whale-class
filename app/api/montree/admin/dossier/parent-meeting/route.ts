// /api/montree/admin/dossier/parent-meeting/route.ts
//
// Session 133 — Astra's parent-meeting dossier endpoint.
//
// PRINCIPAL-ONLY. Free-tier schools get 402.
//
// POST body:
//   {
//     child_id: string,
//     meeting_purpose: string,
//     parent_context?: string,
//     output_format?: 'markdown' | 'html' | 'json'  // default 'markdown'
//   }
//
// Returns 200 with the dossier payload + cost telemetry + source counts.
//
// CACHING: 24h. The route looks up the cache first via the shared key.
//   If the migration 237 table doesn't exist yet, the route still works —
//   it just regenerates each call. The response includes `cache_active`
//   so the UI can surface a "save your dossier" hint when caching is off.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';
import { preparePMeeting } from '@/lib/montree/tracy/tools/prepare_parent_meeting';
// Session 133 post-merge audit-fix: rate-limit. The 24h cache shields
// most repeat-opens, but a malicious caller can bypass by tweaking
// meeting_purpose / parent_context to produce a fresh cache key on
// every call and burn ~$0.05/Sonnet each time. Rate-limit by JWT.sub
// (not IP — multiple users may share an IP on the same school wifi).
import { checkRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Rate limit: 20 dossier-builds per principal per hour. The legitimate
// upper bound is "prepare for 3-4 parent meetings on a Friday afternoon"
// — 20 is comfortably above that, well below abuse.
const RATE_LIMIT_PER_HOUR = 20;

interface PostBody {
  child_id: string;
  meeting_purpose: string;
  parent_context?: string;
  output_format?: 'markdown' | 'html' | 'json';
  /**
   * Principal's UI locale. The dossier output (section headers, prose,
   * blockquote scripts, follow-up plan) is produced in this language.
   * Defaults to 'en'. Validated against SUPPORTED_LOCALES.
   */
  locale?: string;
}

// Subset of i18n SUPPORTED_LOCALES the dossier prompt knows how to handle.
// Mirror of lib/montree/i18n/locale-config.ts — kept local to avoid
// importing the whole config into a hot route. Validation here defends
// against client-injected locale codes ("uk-UK", "<script>") flowing
// into the Sonnet prompt unbounded.
const SUPPORTED_DOSSIER_LOCALES = new Set([
  'en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru',
]);

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Principal only' },
      { status: 403 }
    );
  }

  // Rate-limit per principal (not per IP — Tredoux might be on the same
  // wifi as a teacher and we don't want their photo capture to throttle
  // her dossier prep). 20/hr per principal user-id is generous for real
  // use, tight against abuse.
  const supabaseForLimit = getSupabase();
  const rate = await checkRateLimit(
    supabaseForLimit,
    `principal:${auth.userId}`,
    '/api/montree/admin/dossier/parent-meeting',
    RATE_LIMIT_PER_HOUR,
    60
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Too many dossier requests in the last hour — try again shortly.',
        retry_after_seconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
      }
    );
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.child_id || typeof body.child_id !== 'string') {
    return NextResponse.json(
      { error: 'child_id is required' },
      { status: 400 }
    );
  }
  if (!body.meeting_purpose || typeof body.meeting_purpose !== 'string') {
    return NextResponse.json(
      { error: 'meeting_purpose is required' },
      { status: 400 }
    );
  }
  if (body.meeting_purpose.length > 2000) {
    return NextResponse.json(
      { error: 'meeting_purpose is too long (max 2000 chars)' },
      { status: 400 }
    );
  }
  if (body.parent_context && body.parent_context.length > 4000) {
    return NextResponse.json(
      { error: 'parent_context is too long (max 4000 chars)' },
      { status: 400 }
    );
  }
  const outputFormat =
    body.output_format === 'html' ||
    body.output_format === 'json' ||
    body.output_format === 'markdown'
      ? body.output_format
      : 'markdown';

  // Validate locale against the supported set. Defaults to 'en' if the
  // client sent something we don't recognise — fails open with English
  // output rather than rejecting the request.
  const locale =
    typeof body.locale === 'string' && SUPPORTED_DOSSIER_LOCALES.has(body.locale)
      ? body.locale
      : 'en';

  const supabase = getSupabase();

  // Tier gate. Free schools get 402 with upgrade hint, same shape as
  // every other paid-tier route per Session 105 rule #29.
  const tier = await resolveReportModel(supabase, auth.schoolId);
  if (tier.tier === 'free' || !tier.model) {
    return NextResponse.json(
      {
        error: 'Parent-meeting dossier requires an active AI tier.',
        tier: tier.tier,
        requires_upgrade: true,
        upgrade_url: '/montree/admin/billing',
        feature: 'prepare_parent_meeting',
      },
      { status: 402 }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'AI not configured server-side' },
      { status: 500 }
    );
  }
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const result = await preparePMeeting({
    childId: body.child_id,
    schoolId: auth.schoolId,
    principalId: auth.userId,
    meetingPurpose: body.meeting_purpose,
    parentContext: body.parent_context,
    outputFormat,
    locale,
    anthropic,
    supabase,
  });

  if (!result.ok) {
    // Map common errors to the right status.
    const errMsg = result.error || 'dossier generation failed';
    let status = 500;
    if (
      errMsg.includes('does not belong') ||
      errMsg.includes('child not found')
    ) {
      status = 404;
    } else if (errMsg.includes('required')) {
      status = 400;
    } else if (errMsg.includes('timeout')) {
      status = 504;
    }
    return NextResponse.json({ error: errMsg }, { status });
  }

  return NextResponse.json(
    {
      payload: result.data!.payload,
      output_format: result.data!.output_format,
      generated_at: result.data!.generated_at,
      from_cache: result.data!.from_cache,
      cost_usd: result.data!.cost_usd,
      input_tokens: result.data!.input_tokens,
      output_tokens: result.data!.output_tokens,
      generation_ms: result.data!.generation_ms,
      source_counts: result.data!.source_counts,
      child_name: result.data!.child_name,
      cache_active: result.data!.cache_active,
    },
    { status: 200 }
  );
}

// Convenience GET — same as POST but reads query string. Useful for
// the printable HTML rendering path (window.open('?child_id=...&...&format=html')).
// Auth header can't be set on window.open so we accept the same auth cookie.
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Principal only' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const childId = url.searchParams.get('child_id');
  const meetingPurpose = url.searchParams.get('meeting_purpose');
  const parentContext = url.searchParams.get('parent_context');
  const format = url.searchParams.get('format');
  const localeParam = url.searchParams.get('locale');
  const outputFormat =
    format === 'html' || format === 'json' || format === 'markdown'
      ? (format as 'html' | 'json' | 'markdown')
      : 'html'; // default html for GET — it's the printable path
  const locale =
    localeParam && SUPPORTED_DOSSIER_LOCALES.has(localeParam)
      ? localeParam
      : 'en';

  if (!childId || !meetingPurpose) {
    return NextResponse.json(
      { error: 'child_id and meeting_purpose query params required' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const tier = await resolveReportModel(supabase, auth.schoolId);
  if (tier.tier === 'free' || !tier.model) {
    return NextResponse.json(
      {
        error: 'Parent-meeting dossier requires an active AI tier.',
        requires_upgrade: true,
        upgrade_url: '/montree/admin/billing',
      },
      { status: 402 }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'AI not configured' },
      { status: 500 }
    );
  }
  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const result = await preparePMeeting({
    childId,
    schoolId: auth.schoolId,
    principalId: auth.userId,
    meetingPurpose,
    parentContext: parentContext ?? undefined,
    outputFormat,
    locale,
    anthropic,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'dossier generation failed' },
      { status: 500 }
    );
  }

  if (outputFormat === 'html') {
    return new NextResponse(result.data!.payload, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Don't let an upstream proxy cache this — caching belongs to
        // the in-DB dossier cache where it can be invalidated when the
        // underlying child data changes.
        'Cache-Control': 'private, no-store',
        // Reflect the dossier's locale to the browser. Combined with the
        // <html lang="..."> emitted by renderDossierHtml, this means
        // browser print-to-PDF picks up the right typography defaults
        // and accessibility tools (screen readers, translation) treat
        // the document as the principal's UI language.
        'Content-Language': locale,
      },
    });
  }

  return NextResponse.json(
    {
      payload: result.data!.payload,
      output_format: result.data!.output_format,
      generated_at: result.data!.generated_at,
      from_cache: result.data!.from_cache,
      child_name: result.data!.child_name,
    },
    { status: 200 }
  );
}
