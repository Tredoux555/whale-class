// app/api/montree/onboarding/voice/status/route.ts
// Returns the list of children in the teacher's classroom who lack a mental profile.
// Drives the smart voice onboarding orchestrator: which children still need to be introduced.
//
// Source of truth: presence/absence of a row in montree_child_mental_profiles.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

interface ChildSummary {
  id: string;
  name: string;
  photo_url: string | null;
}

interface StatusPayload {
  pending: ChildSummary[];
  completed_count: number;
  total: number;
  classroom_id: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.classroomId) {
      // Parent / homeschool / principal-without-classroom — return empty
      const empty: StatusPayload = {
        pending: [],
        completed_count: 0,
        total: 0,
        classroom_id: null,
      };
      const res = NextResponse.json({ success: true, ...empty });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const supabase = getSupabase();

    // Fetch all children in this classroom, plus their photos
    const { data: children, error: childrenError } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', auth.classroomId)
      .order('name', { ascending: true });

    if (childrenError) {
      console.error('[VoiceOnboarding/status] Children fetch error:', childrenError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch children' },
        { status: 500 }
      );
    }

    const allChildren = (children ?? []) as ChildSummary[];

    if (allChildren.length === 0) {
      const empty: StatusPayload = {
        pending: [],
        completed_count: 0,
        total: 0,
        classroom_id: auth.classroomId,
      };
      const res = NextResponse.json({ success: true, ...empty });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const childIds = allChildren.map(c => c.id);

    // Fetch which of these children already have a mental profile
    const { data: profiles, error: profilesError } = await supabase
      .from('montree_child_mental_profiles')
      .select('child_id')
      .in('child_id', childIds);

    if (profilesError) {
      console.error('[VoiceOnboarding/status] Profiles fetch error:', profilesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    const onboardedIds = new Set((profiles ?? []).map((p: { child_id: string }) => p.child_id));
    const pending = allChildren.filter(c => !onboardedIds.has(c.id));

    const payload: StatusPayload = {
      pending,
      completed_count: allChildren.length - pending.length,
      total: allChildren.length,
      classroom_id: auth.classroomId,
    };

    const res = NextResponse.json({ success: true, ...payload });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[VoiceOnboarding/status] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
