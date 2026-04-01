import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  // Verify teacher is authenticated
  const authResult = await verifySchoolRequest(request);
  if (!authResult.isValid || !authResult.userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const teacherId = authResult.userId;

  try {
    // Update teacher record
    const { data, error } = await supabase
      .from('montree_teachers')
      .update({
        has_completed_tutorial: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teacherId)
      .select('id, name, has_completed_tutorial')
      .single(); // UPDATE .single() is safe (exact match on id)

    if (error) throw error;

    return NextResponse.json({
      success: true,
      teacher: data,
    });
  } catch (error) {
    console.error('[TUTORIAL-COMPLETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark tutorial complete' },
      { status: 500 }
    );
  }
}
