import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = getSupabase();

    // Get the plan
    const { data: plan, error: planError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get assignments for this plan
    const { data: assignments } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        child_id,
        work_id,
        work_name,
        area,
        notes,
        children (id, name, age_group)
      `)
      .eq('weekly_plan_id', planId);

    // Get progress for these assignments
    const { data: progress } = await supabase
      .from('work_progress')
      .select('*')
      .in('assignment_id', (assignments || []).map(a => a.id));

    return NextResponse.json({
      plan,
      assignments: assignments || [],
      progress: progress || []
    });

  } catch (error) {
    console.error('Get plan error:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const supabase = getSupabase();

    // Delete assignments first (cascade should handle this but being explicit)
    await supabase
      .from('weekly_assignments')
      .delete()
      .eq('weekly_plan_id', planId);

    // Delete the plan
    const { error } = await supabase
      .from('weekly_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
