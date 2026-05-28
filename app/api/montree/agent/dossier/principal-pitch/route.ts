// /api/montree/agent/dossier/principal-pitch/route.ts
//
// Session 133 Phase D — Mira's pitch dossier endpoint.
//
// AGENT-ONLY. No tier gate (agents are paid partners; we want them
// closing deals, not blocked at a 402).
//
// POST body:
//   {
//     principal_name: string,
//     school_name: string,
//     school_size?: string,
//     country?: string,
//     language?: string,
//     known_pain_points?: string[],
//     relationship?: string,
//     output_format?: 'markdown' | 'html' | 'json'
//   }
//
// Returns 200 with the dossier payload + platform signal + cost telemetry.
// 24h cache via the shared montree_meeting_dossiers table.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { preparePitch } from '@/lib/montree/mira/tools/prepare_principal_pitch';
// Session 133 post-merge audit-fix: rate-limit. Agent dossiers have no
// tier gate by design (agents are paid partners) — that puts the
// burden on per-user rate-limiting to keep abuse bounded. Cache bypass
// via tweaked principal_name / pain_points would cost $0.05-0.10/call.
import { checkRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Rate limit: 30 pitch dossiers per agent per hour. Higher than the
// Tracy parent-meeting limit because agents legitimately pitch many
// schools per day; 30/hr covers a full sales day with headroom.
const RATE_LIMIT_PER_HOUR = 30;

interface PostBody {
  principal_name: string;
  school_name: string;
  school_size?: string;
  country?: string;
  language?: string;
  known_pain_points?: string[];
  relationship?: string;
  output_format?: 'markdown' | 'html' | 'json';
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Agent only' }, { status: 403 });
  }

  // Rate-limit per agent (not per IP — agents often work from coffee
  // shops with shared NAT). 30/hr per agent user-id is a full
  // legitimate sales day; abuse trips fast.
  const supabaseForLimit = getSupabase();
  const rate = await checkRateLimit(
    supabaseForLimit,
    `agent:${auth.userId}`,
    '/api/montree/agent/dossier/principal-pitch',
    RATE_LIMIT_PER_HOUR,
    60
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Too many pitch dossiers in the last hour — try again shortly.',
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

  if (!body.principal_name || typeof body.principal_name !== 'string') {
    return NextResponse.json(
      { error: 'principal_name is required' },
      { status: 400 }
    );
  }
  if (!body.school_name || typeof body.school_name !== 'string') {
    return NextResponse.json(
      { error: 'school_name is required' },
      { status: 400 }
    );
  }

  // Length caps on agent-provided strings to keep the prompt bounded.
  if (body.principal_name.length > 200) {
    return NextResponse.json(
      { error: 'principal_name too long (max 200 chars)' },
      { status: 400 }
    );
  }
  if (body.school_name.length > 200) {
    return NextResponse.json(
      { error: 'school_name too long (max 200 chars)' },
      { status: 400 }
    );
  }
  if (body.school_size && body.school_size.length > 400) {
    return NextResponse.json(
      { error: 'school_size too long (max 400 chars)' },
      { status: 400 }
    );
  }
  if (body.relationship && body.relationship.length > 1000) {
    return NextResponse.json(
      { error: 'relationship too long (max 1000 chars)' },
      { status: 400 }
    );
  }
  if (body.known_pain_points && Array.isArray(body.known_pain_points)) {
    for (const p of body.known_pain_points) {
      if (typeof p !== 'string' || p.length > 500) {
        return NextResponse.json(
          { error: 'each pain point must be a string under 500 chars' },
          { status: 400 }
        );
      }
    }
  }

  const outputFormat =
    body.output_format === 'html' ||
    body.output_format === 'json' ||
    body.output_format === 'markdown'
      ? body.output_format
      : 'markdown';

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json(
      { error: 'AI not configured server-side' },
      { status: 500 }
    );
  }
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const supabase = getSupabase();

  const result = await preparePitch({
    principalName: body.principal_name,
    schoolName: body.school_name,
    schoolSize: body.school_size,
    country: body.country,
    language: body.language,
    knownPainPoints: body.known_pain_points,
    relationship: body.relationship,
    agentId: auth.userId,
    outputFormat,
    anthropic,
    supabase,
  });

  if (!result.ok) {
    let status = 500;
    if ((result.error || '').includes('required')) status = 400;
    if ((result.error || '').includes('timeout')) status = 504;
    return NextResponse.json(
      { error: result.error || 'pitch dossier failed' },
      { status }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}

// GET — printable HTML view. Same pattern as Tracy's GET.
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Agent only' }, { status: 403 });
  }

  const url = new URL(request.url);
  const principalName = url.searchParams.get('principal_name');
  const schoolName = url.searchParams.get('school_name');
  if (!principalName || !schoolName) {
    return NextResponse.json(
      { error: 'principal_name and school_name query params required' },
      { status: 400 }
    );
  }

  const format = url.searchParams.get('format');
  const outputFormat =
    format === 'html' || format === 'json' || format === 'markdown'
      ? (format as 'html' | 'json' | 'markdown')
      : 'html';

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const supabase = getSupabase();

  const knownPainPoints = url.searchParams.getAll('pain_point');

  const result = await preparePitch({
    principalName,
    schoolName,
    schoolSize: url.searchParams.get('school_size') ?? undefined,
    country: url.searchParams.get('country') ?? undefined,
    language: url.searchParams.get('language') ?? undefined,
    knownPainPoints: knownPainPoints.length > 0 ? knownPainPoints : undefined,
    relationship: url.searchParams.get('relationship') ?? undefined,
    agentId: auth.userId,
    outputFormat,
    anthropic,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'pitch dossier failed' },
      { status: 500 }
    );
  }

  if (outputFormat === 'html') {
    return new NextResponse(result.data!.payload, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return NextResponse.json(result.data, { status: 200 });
}
