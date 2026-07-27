// /api/montree/reports/weekly-wrap/edit/route.ts
// PATCH: Edit parent report content (narrative text, photo removals/reorder)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { requeueMontageJob } from '@/lib/montree/montage/enqueue';

// Stable identity of a report's curated photo set — order matters (the montage
// plays the photos in array order), so this is a join, not a set.
function photoSetKey(photos: unknown): string {
  return (Array.isArray(photos) ? photos : [])
    .map(p => (p as { id?: unknown } | null)?.id)
    .filter((id): id is string => typeof id === 'string')
    .join(',');
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { report_id, narrative, photos, works } = body as {
      report_id: string;
      narrative?: string;           // Updated narrative text
      photos?: Array<{              // Updated photos array (after removal/reorder)
        id: string;
        url: string;
        work_name?: string;
        caption?: string;
        captured_at?: string;
      }>;
      works?: Array<{               // Updated works array (after removal)
        name: string;
        area: string;
        status?: string;
        parent_description?: string;
        why_it_matters?: string;
        photo_url?: string;
        photo_caption?: string;
      }>;
    };

    if (!report_id) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get existing report
    const { data: existing } = await supabase
      .from('montree_weekly_reports')
      .select('id, content, school_id, child_id, classroom_id')
      .eq('id', report_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const content = existing.content as Record<string, unknown>;
    // Snapshot before mutation — a changed photo set makes any existing
    // "Week in Film" montage stale and it has to be re-rendered.
    const photosBefore = photoSetKey(content.photos);

    // Update narrative if provided
    if (narrative !== undefined) {
      const narrativeObj = (content.narrative || {}) as Record<string, unknown>;
      narrativeObj.summary = narrative;
      narrativeObj.edited_at = new Date().toISOString();
      narrativeObj.edited_by = 'teacher';
      content.narrative = narrativeObj;
    }

    // Update photos if provided (supports removal and reorder)
    if (photos !== undefined) {
      content.photos = photos;
    }

    // Update works if provided (supports removal)
    if (works !== undefined) {
      content.works = works;
    }

    // Save
    const { error: updateErr } = await supabase
      .from('montree_weekly_reports')
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id)
      .eq('school_id', auth.schoolId);

    if (updateErr) {
      console.error('Edit report error:', updateErr);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    // The teacher changed the curated photo set, so the montage that was queued
    // when the report was generated no longer matches it — re-queue the render.
    // Fire-and-forget: the helper self-gates (>= 8 eligible photos, never
    // interrupts a render in flight) and swallows every error.
    if (photos !== undefined && photoSetKey(photos) !== photosBefore) {
      const report = existing as unknown as {
        child_id: string; school_id: string; classroom_id: string | null;
      };
      void requeueMontageJob(supabase, {
        reportId: report_id,
        childId: report.child_id,
        schoolId: report.school_id,
        classroomId: report.classroom_id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
