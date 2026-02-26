// app/api/montree/guru/concerns/route.ts
// GET/POST saved concerns for a child (stored in montree_children.settings JSONB)
// Used by GuruOnboardingPicker and GuruChatThread

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET: Fetch child's saved concerns
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();
    const { data: child } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .single();

    const settings = (child?.settings as Record<string, unknown>) || {};

    return NextResponse.json({
      success: true,
      concerns: (settings.guru_concerns as string[]) || [],
      onboarded: !!settings.guru_onboarded,
    });
  } catch (error) {
    console.error('[Guru Concerns] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch concerns' }, { status: 500 });
  }
}

// POST: Save selected concern IDs
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, concerns } = body;

    if (!child_id || !Array.isArray(concerns)) {
      return NextResponse.json({ success: false, error: 'child_id and concerns array required' }, { status: 400 });
    }

    if (concerns.length < 1 || concerns.length > 5) {
      return NextResponse.json({ success: false, error: 'Select 1-5 concerns' }, { status: 400 });
    }

    // Validate all concern IDs are strings
    if (!concerns.every((c: unknown) => typeof c === 'string' && c.length > 0 && c.length < 50)) {
      return NextResponse.json({ success: false, error: 'Invalid concern IDs' }, { status: 400 });
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Read existing settings, merge in concerns
    const { data: child } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', child_id)
      .single();

    const existingSettings = (child?.settings as Record<string, unknown>) || {};

    const { error: updateError } = await supabase
      .from('montree_children')
      .update({
        settings: {
          ...existingSettings,
          guru_concerns: concerns,
          guru_onboarded: true,
        },
      })
      .eq('id', child_id);

    if (updateError) {
      console.error('[Guru Concerns] Update error:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to save concerns' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Guru Concerns] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save concerns' }, { status: 500 });
  }
}
