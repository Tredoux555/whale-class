// app/api/montree/paperwork/read-week/route.ts
//
// POST — Mark a photo as a paperwork page and run Haiku vision to detect
// the week number in the top-left corner. For every child tagged in the
// photo, bump their `montree_children.paperwork_current_week` if the
// detected week is higher than the current week and confidence >= 0.7.
//
// Designed to be fired fire-and-forget from the client (keepalive: true).
// Returns immediately on auth success and runs the vision call + updates
// in the background-ish, but we do await so the audit log is populated
// before the response. Typical latency ~1.5-3s.
//
// Auth: verifySchoolRequest() + verifyChildBelongsToSchool() for every
// tagged child (direct child_id + junction child_ids via
// montree_media_children).
//
// Cost: ~$0.002 per paperwork page via Haiku vision with tool_use.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { anthropic, HAIKU_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';
import { getPublicUrl } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CONFIDENCE_THRESHOLD = 0.7;
const MAX_WEEK = 52;

const READ_WEEK_TOOL = {
  name: 'report_paperwork_week',
  description:
    "Report the week number visible on this Montessori paperwork/worksheet page. Look at the TOP-LEFT corner of the page first — teachers typically write the week number there as 'Week 12', 'W-12', 'W12', or just a circled number. If not in the top-left, scan the whole page header area.",
  input_schema: {
    type: 'object' as const,
    properties: {
      found: {
        type: 'boolean',
        description: 'True if a week number is clearly visible anywhere on the page.',
      },
      week: {
        type: 'integer',
        description: 'The week number (1-52). Set to 0 if not found.',
        minimum: 0,
        maximum: 52,
      },
      confidence: {
        type: 'number',
        description:
          'How confident you are in the reading: 1.0 = crystal clear printed/written number in expected spot, 0.8 = visible but slightly ambiguous, 0.5 = guess, 0.0 = no number visible.',
        minimum: 0,
        maximum: 1,
      },
      location: {
        type: 'string',
        description: 'Where on the page you found it: "top-left" | "top-right" | "header" | "other" | "not-found".',
      },
    },
    required: ['found', 'week', 'confidence', 'location'],
  },
};

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'No school' }, { status: 403 });
    }

    const supabase = getSupabase();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await checkRateLimit(supabase, ip, '/api/montree/paperwork/read-week', 120, 60);
    if (!rate.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { media_id } = body as { media_id?: string };

    if (!media_id || typeof media_id !== 'string') {
      return NextResponse.json({ success: false, error: 'media_id required' }, { status: 400 });
    }

    // Load media row — confirm ownership + get storage path + tagged child
    const { data: mediaRow, error: mediaErr } = await supabase
      .from('montree_media')
      .select('id, school_id, classroom_id, child_id, storage_path, is_paperwork, paperwork_week_detected')
      .eq('id', media_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (mediaErr || !mediaRow) {
      return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
    }

    if (!mediaRow.storage_path) {
      return NextResponse.json(
        { success: false, error: 'Media has no storage_path' },
        { status: 400 }
      );
    }

    const classroomId = mediaRow.classroom_id || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'No classroom on media' },
        { status: 400 }
      );
    }

    // Gather all tagged children: direct child_id + junction rows
    const taggedChildIds = new Set<string>();
    if (mediaRow.child_id) taggedChildIds.add(mediaRow.child_id);

    const { data: junctionRows } = await supabase
      .from('montree_media_children')
      .select('child_id')
      .eq('media_id', media_id);

    for (const row of (junctionRows || []) as Array<{ child_id: string }>) {
      if (row.child_id) taggedChildIds.add(row.child_id);
    }

    // Verify every tagged child belongs to this school AND this classroom
    const verifiedChildIds: string[] = [];
    for (const cid of taggedChildIds) {
      const access = await verifyChildBelongsToSchool(cid, auth.schoolId);
      if (access.allowed && access.classroomId === classroomId) {
        verifiedChildIds.push(cid);
      }
    }

    // Mark media as paperwork regardless — the teacher said so.
    // Do this BEFORE vision so even if Haiku fails, the flag sticks.
    const { error: flagErr } = await supabase
      .from('montree_media')
      .update({ is_paperwork: true })
      .eq('id', media_id);

    if (flagErr) {
      console.error('[Paperwork] Failed to flag media as paperwork:', flagErr.message);
      return NextResponse.json(
        { success: false, error: 'Failed to flag as paperwork' },
        { status: 500 }
      );
    }

    // If we've already read the week on this media, don't re-bill Haiku.
    if (typeof mediaRow.paperwork_week_detected === 'number' && mediaRow.paperwork_week_detected > 0) {
      return NextResponse.json({
        success: true,
        already_processed: true,
        week: mediaRow.paperwork_week_detected,
        message: 'Paperwork flag set. Week was previously detected.',
      });
    }

    if (!AI_ENABLED || !anthropic) {
      // AI disabled — still honor the paperwork flag, just skip vision.
      return NextResponse.json({
        success: true,
        ai_disabled: true,
        message: 'Paperwork flag set. AI vision disabled — week not detected.',
      });
    }

    // Run Haiku vision
    const photoUrl = getPublicUrl('montree-media', mediaRow.storage_path);
    let detectedWeek: number | null = null;
    let confidence = 0;
    let location = 'not-found';
    let found = false;

    try {
      const msg = await anthropic.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 300,
        system:
          "You are reading a Montessori paperwork page to find the week number. Teachers typically label paperwork packets 'Week 1' through 'Week 37' or so. Look at the top-left corner of the page first — that's the standard location. Accept formats like 'Week 12', 'W-12', 'W12', 'Wk 12', or a circled/boxed number. Return your best reading via the report_paperwork_week tool.",
        tools: [READ_WEEK_TOOL],
        tool_choice: { type: 'tool', name: 'report_paperwork_week' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: photoUrl } },
              {
                type: 'text',
                text: "What week number is written on this page? Check the top-left first.",
              },
            ],
          },
        ],
      });

      for (const block of msg.content) {
        if (block.type === 'tool_use' && block.name === 'report_paperwork_week') {
          const input = block.input as {
            found?: boolean;
            week?: number;
            confidence?: number;
            location?: string;
          };
          found = Boolean(input.found);
          detectedWeek = typeof input.week === 'number' ? Math.round(input.week) : null;
          confidence = typeof input.confidence === 'number' ? input.confidence : 0;
          location = typeof input.location === 'string' ? input.location : 'not-found';
          break;
        }
      }
    } catch (visionErr: any) {
      console.error('[Paperwork] Haiku vision error:', visionErr?.message || visionErr);
      return NextResponse.json({
        success: true,
        vision_failed: true,
        error: visionErr?.message || 'Vision call failed',
      });
    }

    // Validate detection
    if (!found || detectedWeek === null || detectedWeek < 1 || detectedWeek > MAX_WEEK) {
      // Write back what we did see so the audit log can explain.
      await supabase
        .from('montree_media')
        .update({
          paperwork_week_detected: detectedWeek && detectedWeek > 0 ? detectedWeek : null,
          paperwork_week_confidence: confidence,
        })
        .eq('id', media_id);

      // Log a "no week found" entry against each child so the UI can surface it.
      const logRows = verifiedChildIds.map(cid => ({
        child_id: cid,
        media_id,
        classroom_id: classroomId,
        old_week: null,
        new_week: null,
        detected_week: detectedWeek,
        confidence,
        applied: false,
        reason: 'low_confidence',
      }));
      if (logRows.length > 0) {
        await supabase.from('montree_paperwork_week_updates').insert(logRows);
      }

      return NextResponse.json({
        success: true,
        found,
        week: detectedWeek,
        confidence,
        location,
        applied: false,
        reason: found ? 'low_confidence' : 'not_found',
        children_updated: 0,
      });
    }

    // Persist detection on media row
    await supabase
      .from('montree_media')
      .update({
        paperwork_week_detected: detectedWeek,
        paperwork_week_confidence: confidence,
      })
      .eq('id', media_id);

    // For each verified child: check current week, apply no-downgrade update
    let childrenUpdated = 0;
    const auditRows: any[] = [];

    for (const cid of verifiedChildIds) {
      const { data: childRow } = await supabase
        .from('montree_children')
        .select('id, paperwork_current_week')
        .eq('id', cid)
        .maybeSingle();

      if (!childRow) continue;

      const oldWeek: number = typeof childRow.paperwork_current_week === 'number'
        ? childRow.paperwork_current_week
        : 0;

      if (confidence < CONFIDENCE_THRESHOLD) {
        auditRows.push({
          child_id: cid,
          media_id,
          classroom_id: classroomId,
          old_week: oldWeek,
          new_week: oldWeek,
          detected_week: detectedWeek,
          confidence,
          applied: false,
          reason: 'low_confidence',
        });
        continue;
      }

      if (detectedWeek === oldWeek) {
        auditRows.push({
          child_id: cid,
          media_id,
          classroom_id: classroomId,
          old_week: oldWeek,
          new_week: oldWeek,
          detected_week: detectedWeek,
          confidence,
          applied: false,
          reason: 'same_week',
        });
        continue;
      }

      if (detectedWeek < oldWeek) {
        // No-downgrade — kid is ahead of this page, don't regress
        auditRows.push({
          child_id: cid,
          media_id,
          classroom_id: classroomId,
          old_week: oldWeek,
          new_week: oldWeek,
          detected_week: detectedWeek,
          confidence,
          applied: false,
          reason: 'no_downgrade',
        });
        continue;
      }

      // Apply the bump
      const { error: updateErr } = await supabase
        .from('montree_children')
        .update({ paperwork_current_week: detectedWeek })
        .eq('id', cid);

      if (updateErr) {
        console.error('[Paperwork] Failed to update child', cid, updateErr.message);
        auditRows.push({
          child_id: cid,
          media_id,
          classroom_id: classroomId,
          old_week: oldWeek,
          new_week: oldWeek,
          detected_week: detectedWeek,
          confidence,
          applied: false,
          reason: 'update_failed',
        });
        continue;
      }

      childrenUpdated++;
      auditRows.push({
        child_id: cid,
        media_id,
        classroom_id: classroomId,
        old_week: oldWeek,
        new_week: detectedWeek,
        detected_week: detectedWeek,
        confidence,
        applied: true,
        reason: 'applied',
      });
    }

    if (auditRows.length > 0) {
      const { error: auditErr } = await supabase
        .from('montree_paperwork_week_updates')
        .insert(auditRows);
      if (auditErr) {
        console.error('[Paperwork] Audit log insert failed (non-fatal):', auditErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      found: true,
      week: detectedWeek,
      confidence,
      location,
      applied: childrenUpdated > 0,
      children_updated: childrenUpdated,
      children_total: verifiedChildIds.length,
    });
  } catch (err: any) {
    console.error('[Paperwork] Unhandled error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
