import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const authResult = await verifySchoolRequest(request);

  // verifySchoolRequest returns NextResponse on failure
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { feature_module } = await request.json();

    if (!feature_module) {
      return NextResponse.json(
        { error: 'feature_module is required' },
        { status: 400 }
      );
    }

    // Insert skipped record for the entire module
    const { error } = await supabase
      .from('montree_onboarding_progress')
      .upsert(
        {
          user_id: authResult.userId,
          user_type: authResult.role || 'teacher',
          feature_module,
          step_key: '__module_skipped__',
          skipped: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,user_type,feature_module,step_key' }
      );

    if (error) throw error;

    // Log analytics event (fire-and-forget)
    supabase.from('montree_onboarding_events').insert({
      user_id: authResult.userId,
      user_type: authResult.role || 'teacher',
      event_type: 'tour_dismissed',
      feature_module,
      step_key: null,
    }).then(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to skip module' },
      { status: 500 }
    );
  }
}
