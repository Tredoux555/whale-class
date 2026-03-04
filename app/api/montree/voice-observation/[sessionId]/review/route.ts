// app/api/montree/voice-observation/[sessionId]/review/route.ts
// Get extractions for teacher review, grouped by child

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();

    // Fetch session and verify school
    const { data: session } = await supabase
      .from('voice_observation_sessions')
      .select('id, status, session_date, duration_seconds, transcript_word_count, extractions_count, approved_count, rejected_count, total_cost_cents, school_id, classroom_id')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }
    if (session.school_id !== auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Fetch all extractions
    const { data: extractions } = await supabase
      .from('voice_observation_extractions')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false });

    // Collect unique child_ids to fetch names
    const childIds = [...new Set(
      (extractions || []).map(e => e.child_id).filter(Boolean)
    )];

    let children: Record<string, { id: string; name: string }> = {};
    if (childIds.length > 0) {
      const { data: childData } = await supabase
        .from('montree_children')
        .select('id, name')
        .in('id', childIds);

      for (const child of childData || []) {
        children[child.id] = child;
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        sessionDate: session.session_date,
        durationSeconds: session.duration_seconds,
        wordCount: session.transcript_word_count,
        extractionsCount: session.extractions_count,
        approvedCount: session.approved_count || 0,
        rejectedCount: session.rejected_count || 0,
        totalCostCents: session.total_cost_cents,
      },
      extractions: extractions || [],
      children,
    });
  } catch (error) {
    console.error('[VoiceObs] Review error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load review data' },
      { status: 500 }
    );
  }
}
