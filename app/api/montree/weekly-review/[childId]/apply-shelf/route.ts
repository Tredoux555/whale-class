// /api/montree/weekly-review/[childId]/apply-shelf/route.ts
// POST: Extract work recommendations from teacher review and update the child's shelf
// Body: { review_text: string }
// Uses Sonnet to parse the review into structured shelf updates

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { findCurriculumWorkByName, enrichWithChineseNames } from '@/lib/montree/curriculum-loader';

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await params;

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = await checkRateLimit(supabase, ip, '/api/montree/weekly-review/apply-shelf', 20, 1440);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { review_text } = body;

    if (!review_text || typeof review_text !== 'string') {
      return NextResponse.json({ error: 'review_text required' }, { status: 400 });
    }
    if (review_text.length > 50000) {
      return NextResponse.json({ error: 'review_text too long (max 50000 chars)' }, { status: 400 });
    }

    // Ask Sonnet to extract next week's work recommendations as structured JSON
    const extractPrompt = `Extract the next week's work plan from this Montessori teacher review.

REVIEW:
${review_text.slice(0, 4000)}

Return a JSON array with one entry per area that has a recommendation. Each entry:
{
  "area": "practical_life" | "sensorial" | "mathematics" | "language" | "cultural",
  "work_name": "exact work name as written in the review",
  "reason": "brief reason from the review (1 sentence)"
}

Only include areas where a SPECIFIC work is recommended for next week.
If the review says "continue current work", include it with the current work name.
Return ONLY the JSON array, no markdown fencing.`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: extractPrompt }],
    });

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Parse the JSON response
    let recommendations: Array<{ area: string; work_name: string; reason: string }>;
    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }
    try {
      // Strip markdown fencing if present
      const cleaned = responseText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse shelf recommendations:', responseText.slice(0, 200));
      return NextResponse.json({ error: 'Failed to parse recommendations' }, { status: 500 });
    }

    if (!Array.isArray(recommendations)) {
      return NextResponse.json({ error: 'Invalid recommendations format' }, { status: 500 });
    }

    const supabase = getSupabase();
    const applied: Array<{ area: string; work_name: string; status: string }> = [];
    const skipped: Array<{ area: string; work_name: string; reason: string }> = [];

    for (const rec of recommendations) {
      // Validate area
      if (!AREAS.includes(rec.area)) {
        skipped.push({ ...rec, reason: `Invalid area '${rec.area}'` });
        continue;
      }

      // Validate work name exists in curriculum
      const workName = typeof rec.work_name === 'string' ? rec.work_name.trim() : '';
      if (!workName || workName.length > 200) {
        skipped.push({ area: rec.area, work_name: workName, reason: 'Invalid work name' });
        continue;
      }

      // Upsert focus work
      const { error: upsertError } = await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: childId,
          area: rec.area,
          work_name: workName,
          status: 'not_started',
          set_by: 'weekly_review',
          set_at: new Date().toISOString(),
        }, { onConflict: 'child_id,area' });

      if (upsertError) {
        console.error('Shelf upsert error:', upsertError);
        skipped.push({ area: rec.area, work_name: workName, reason: 'Database error' });
        continue;
      }

      // Also ensure progress record exists
      const { error: progressError } = await supabase
        .from('montree_child_progress')
        .upsert({
          child_id: childId,
          work_name: workName,
          area: rec.area,
          status: 'not_started',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id,work_name' });

      if (progressError) {
        console.error('Progress upsert error:', progressError);
      }

      // Store guru reasoning
      try {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('settings')
          .eq('id', childId)
          .maybeSingle();

        const settings = (childData?.settings as Record<string, unknown>) || {};
        const guruReasons = (settings.guru_area_reasons as Record<string, string>) || {};
        guruReasons[rec.area] = (rec.reason || '').slice(0, 500);

        await supabase
          .from('montree_children')
          .update({ settings: { ...settings, guru_area_reasons: guruReasons } })
          .eq('id', childId);
      } catch (err) {
        console.error('Failed to save guru reasoning for area:', rec.area, err);
      }

      applied.push({ area: rec.area, work_name: workName, status: 'not_started' });
    }

    // Enrich applied works with Chinese names for UI display
    const enrichedApplied = enrichWithChineseNames(applied);

    return NextResponse.json({
      success: true,
      applied: enrichedApplied,
      skipped,
      total_applied: applied.length,
      total_skipped: skipped.length,
    });

  } catch (error) {
    console.error('Apply shelf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
