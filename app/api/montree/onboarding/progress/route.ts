import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const authResult = await verifySchoolRequest(request);

  // verifySchoolRequest returns NextResponse on failure, VerifiedRequest on success
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { feature_module, step_key } = await request.json();

    if (!feature_module || !step_key) {
      return NextResponse.json(
        { error: 'feature_module and step_key are required' },
        { status: 400 }
      );
    }

    // Upsert progress — match on the UNIQUE constraint columns
    const { error } = await supabase
      .from('montree_onboarding_progress')
      .upsert(
        {
          user_id: authResult.userId,
          user_type: authResult.role || 'teacher',
          feature_module,
          step_key,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,user_type,feature_module,step_key' }
      );

    if (error) throw error;

    // Log analytics event (fire-and-forget)
    supabase.from('montree_onboarding_events').insert({
      user_id: authResult.userId,
      user_type: authResult.role || 'teacher',
      event_type: 'step_completed',
      feature_module,
      step_key,
    }).then(() => {});

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const authResult = await verifySchoolRequest(request);

  // verifySchoolRequest returns NextResponse on failure
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { data, error } = await supabase
      .from('montree_onboarding_progress')
      .select('feature_module, step_key, completed_at, skipped')
      .eq('user_id', authResult.userId)
      .eq('user_type', authResult.role || 'teacher');

    if (error) throw error;

    return NextResponse.json({ progress: data || [] });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
