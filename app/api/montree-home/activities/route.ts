import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const count = parseInt(searchParams.get('count') || '3');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.rpc('get_home_today_activities', {
      p_child_id: childId,
      p_count: count
    });

    if (error) throw error;

    return NextResponse.json({ activities: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { child_id, curriculum_work_id, action, status } = body;

    if (!child_id || !curriculum_work_id) {
      return NextResponse.json(
        { error: 'child_id and curriculum_work_id required' },
        { status: 400 }
      );
    }

    const { data: child } = await supabase
      .from('home_children')
      .select('family_id')
      .eq('id', child_id)
      .single();

    if (action === 'mark_done') {
      const { error } = await supabase
        .from('home_child_progress')
        .upsert({
          child_id,
          curriculum_work_id,
          status: 3,
          mastered_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'child_id,curriculum_work_id'
        });

      if (error) throw error;

      if (child?.family_id) {
        await supabase.from('home_activity_log').insert({
          family_id: child.family_id,
          child_id,
          activity_type: 'work_completed',
          activity_data: { curriculum_work_id }
        });
      }

      return NextResponse.json({ success: true });
    }

    if (status !== undefined) {
      const updates: Record<string, unknown> = {
        child_id,
        curriculum_work_id,
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 1) updates.presented_date = new Date().toISOString().split('T')[0];
      if (status === 2) updates.practicing_date = new Date().toISOString().split('T')[0];
      if (status === 3) updates.mastered_date = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('home_child_progress')
        .upsert(updates, {
          onConflict: 'child_id,curriculum_work_id'
        });

      if (error) throw error;

      if (child?.family_id) {
        await supabase.from('home_activity_log').insert({
          family_id: child.family_id,
          child_id,
          activity_type: 'status_updated',
          activity_data: { curriculum_work_id, new_status: status }
        });
      }

      return NextResponse.json({ success: true });
    }

    const { data: existing } = await supabase
      .from('home_child_progress')
      .select('times_practiced')
      .eq('child_id', child_id)
      .eq('curriculum_work_id', curriculum_work_id)
      .single();

    const { error } = await supabase
      .from('home_child_progress')
      .upsert({
        child_id,
        curriculum_work_id,
        times_practiced: (existing?.times_practiced || 0) + 1,
        last_practiced: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'child_id,curriculum_work_id'
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
