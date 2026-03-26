// POST /api/montree/curriculum/enrich-preview
// Preview AI-generated enrichment fields for a custom work BEFORE saving to DB.
// Returns structured content: description, quick_guide, parent_description, etc.
// Teacher can review/edit before saving. No DB writes — preview only.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { generateWorkEnrichment } from '@/lib/montree/guru/work-enrichment';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';

const PREVIEW_TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Rate limit: 30 preview calls per 15 minutes per IP (text-only, cheaper than vision)
    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, retryAfterSeconds } = await checkRateLimit(supabase, ip, '/api/montree/curriculum/enrich-preview', 30, 15);
    if (!allowed) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${retryAfterSeconds || 60}s` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { work_name, area_key, teacher_description } = body;

    // Input validation
    if (!work_name || typeof work_name !== 'string' || work_name.length > 255) {
      return NextResponse.json({ error: 'work_name required (1-255 chars)' }, { status: 400 });
    }
    if (!area_key || typeof area_key !== 'string') {
      return NextResponse.json({ error: 'area_key required' }, { status: 400 });
    }
    if (teacher_description && (typeof teacher_description !== 'string' || teacher_description.length > 500)) {
      return NextResponse.json({ error: 'teacher_description must be string under 500 chars' }, { status: 400 });
    }

    // Generate enrichment preview (NOT saved to DB)
    const enrichment = await generateWorkEnrichment(
      work_name.trim(),
      area_key,
      { retries: 2, timeoutMs: PREVIEW_TIMEOUT_MS, teacherDescription: teacher_description } as any
    );

    return NextResponse.json({
      description: enrichment.description,
      quick_guide: enrichment.quick_guide,
      parent_description: enrichment.parent_description,
      why_it_matters: enrichment.why_it_matters,
      direct_aims: enrichment.direct_aims,
      indirect_aims: enrichment.indirect_aims,
      materials: enrichment.materials,
      visual_description: enrichment.visual_description || null,
    });

  } catch (error) {
    console.error('[ENRICH_PREVIEW] Error:', error instanceof Error ? error.message : error);

    if (
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && error.message.includes('after'))
    ) {
      return NextResponse.json({ error: 'AI generation timed out. Please try again.' }, { status: 504 });
    }

    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
