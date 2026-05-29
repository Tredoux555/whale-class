// app/api/montree/admin/parents/[parentId]/export/route.ts
//
// Ultimate Astra Phase E — GDPR/CCPA data-export endpoint.
//
// Returns ALL parent data (profile + meetings + decrypted transcripts +
// analyses) as JSON for compliance with right-to-access requests. The
// principal exports + delivers to the parent via whatever channel is
// appropriate.
//
// SCHOOL-SCOPED. Principal-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';

export const maxDuration = 60;

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

interface MeetingRowExport {
  id: string;
  meeting_type: string;
  status: string;
  held_at: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  outcome_notes: string;
  locale: string;
  transcript_id: string | null;
  analysis_id: string | null;
  created_at: string;
}

interface TranscriptRowExport {
  id: string;
  transcript_text_encrypted: string;
  encryption_version: number | null;
  locale_detected: string | null;
  chunk_count: number;
  audio_destroyed_at: string;
  created_at: string;
}

interface AnalysisRowExport {
  id: string;
  summary_markdown: string;
  parent_revealed: string[] | null;
  commitments_made: string[] | null;
  emotional_arc: string | null;
  triggers_observed: string[] | null;
  moves_that_landed: string[] | null;
  unresolved_threads: string[] | null;
  recommended_follow_up: string | null;
  profile_update_proposals: Record<string, unknown> | null;
  proposals_reviewed_at: string | null;
  proposals_review_outcome: string | null;
  cost_usd: number | null;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can export parent data.' },
      { status: 403 }
    );
  }

  const { parentId } = await params;
  if (!parentId) {
    return NextResponse.json({ error: 'parentId is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 1. Verify parent.
  const { data: parent } = await supabase
    .from('montree_parents')
    .select('*')
    .eq('id', parentId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }

  // 2. Profile.
  let profile: Record<string, unknown> | null = null;
  try {
    const { data } = await supabase
      .from('montree_parent_profiles')
      .select('*')
      .eq('parent_id', parentId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    profile = data as Record<string, unknown> | null;
  } catch (err) {
    if (!isMigrationMissing(err)) {
      console.warn('[parents/export] profile load failed:', err);
    }
  }

  // 3. Linked children (names only).
  const { data: junctionRows } = await supabase
    .from('montree_parent_children')
    .select('child_id')
    .eq('parent_id', parentId);
  const childIds = (junctionRows ?? []).map(
    (r: { child_id: string }) => r.child_id
  );
  let children: Array<{ id: string; name: string }> = [];
  if (childIds.length > 0) {
    const { data: childRows } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);
    children = ((childRows as Array<{ id: string; name: string }>) ?? []).map(
      (c) => ({ id: c.id, name: c.name })
    );
  }

  // 4. Meetings.
  let meetings: MeetingRowExport[] = [];
  try {
    const { data } = await supabase
      .from('montree_parent_meetings')
      .select(
        'id, meeting_type, status, held_at, scheduled_at, duration_minutes, outcome_notes, locale, transcript_id, analysis_id, created_at'
      )
      .eq('parent_id', parentId)
      .eq('school_id', auth.schoolId)
      .order('created_at', { ascending: true });
    meetings = (data as MeetingRowExport[]) ?? [];
  } catch (err) {
    if (!isMigrationMissing(err)) {
      console.warn('[parents/export] meetings load failed:', err);
    }
  }

  // 5. Transcripts (decrypted for export).
  const transcriptIds = meetings
    .map((m) => m.transcript_id)
    .filter((id): id is string => !!id);
  let transcripts: Array<TranscriptRowExport & { transcript_text: string }> = [];
  if (transcriptIds.length > 0) {
    try {
      const { data: tRows } = await supabase
        .from('montree_parent_meeting_transcripts')
        .select('*')
        .in('id', transcriptIds)
        .eq('school_id', auth.schoolId);
      transcripts = ((tRows as TranscriptRowExport[]) ?? []).map((t) => ({
        ...t,
        transcript_text: readEncryptedField(
          t.transcript_text_encrypted,
          t.encryption_version
        ),
      }));
    } catch (err) {
      if (!isMigrationMissing(err)) {
        console.warn('[parents/export] transcripts load failed:', err);
      }
    }
  }

  // 6. Analyses.
  const analysisIds = meetings
    .map((m) => m.analysis_id)
    .filter((id): id is string => !!id);
  let analyses: AnalysisRowExport[] = [];
  if (analysisIds.length > 0) {
    try {
      const { data: aRows } = await supabase
        .from('montree_parent_meeting_analyses')
        .select('*')
        .in('id', analysisIds)
        .eq('school_id', auth.schoolId);
      analyses = (aRows as AnalysisRowExport[]) ?? [];
    } catch (err) {
      if (!isMigrationMissing(err)) {
        console.warn('[parents/export] analyses load failed:', err);
      }
    }
  }

  // 7. Strip encrypted field from transcript response payload.
  const transcriptsClean = transcripts.map((t) => {
    const obj: Record<string, unknown> = { ...t };
    delete obj.transcript_text_encrypted;
    return obj;
  });

  return NextResponse.json(
    {
      exported_at: new Date().toISOString(),
      exported_by_principal_id: auth.userId,
      parent,
      profile,
      children,
      meetings,
      transcripts: transcriptsClean,
      analyses,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="parent-export-${parentId}.json"`,
      },
    }
  );
}
