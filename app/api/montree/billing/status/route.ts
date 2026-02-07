// /api/montree/billing/status/route.ts
// Get billing status and history
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get school billing info
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select(`
        id, name, 
        subscription_plan, subscription_status,
        trial_ends_at, current_period_end, max_students
      `)
      .eq('id', schoolId)
      .single();

    if (schoolError) throw schoolError;

    // Get billing history
    const { data: history } = await supabase
      .from('montree_billing_history')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      school,
      history: history || [],
    });

  } catch (error) {
    console.error('Billing status error:', error);
    return NextResponse.json({ error: 'Failed to get billing status' }, { status: 500 });
  }
}
