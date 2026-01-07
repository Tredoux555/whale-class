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
  const count = parseInt(searchParams.get('count') || '5');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get child's family
    const { data: child } = await supabase
      .from('home_children')
      .select('family_id, birth_date')
      .eq('id', childId)
      .single();

    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Calculate child's age
    const birthDate = new Date(child.birth_date);
    const now = new Date();
    const ageYears = (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Get child's current progress
    const { data: progress } = await supabase
      .from('home_child_progress')
      .select('curriculum_work_id, status')
      .eq('child_id', childId);

    const masteredIds = (progress || [])
      .filter(p => p.status === 3)
      .map(p => p.curriculum_work_id);

    const inProgressIds = (progress || [])
      .filter(p => p.status > 0 && p.status < 3)
      .map(p => p.curriculum_work_id);

    // Get curriculum items from master, prioritizing:
    // 1. Items in progress
    // 2. New items appropriate for age
    let query = supabase
      .from('home_curriculum_master')
      .select('*')
      .eq('is_active', true)
      .order('area_sequence')
      .order('sequence');

    const { data: curriculum, error } = await query;

    if (error) throw error;

    // Filter and sort activities
    const activities = (curriculum || [])
      .filter(item => {
        // Parse age range (e.g., "3-4" or "2.5-3.5")
        const [minAge, maxAge] = (item.age_range || '2.5-6').split('-').map(parseFloat);
        return ageYears >= minAge && ageYears <= maxAge + 1; // Give some flexibility
      })
      .filter(item => !masteredIds.includes(item.id))
      .map(item => {
        const progressRecord = (progress || []).find(p => p.curriculum_work_id === item.id);
        return {
          id: item.id,
          curriculum_work_id: item.id,
          name: item.name,
          description: item.description,
          area: item.area,
          category: item.category,
          age_range: item.age_range,
          materials: typeof item.materials === 'string' ? JSON.parse(item.materials) : item.materials,
          direct_aim: item.direct_aim,
          indirect_aim: item.indirect_aim,
          presentation_steps: typeof item.presentation_steps === 'string' 
            ? JSON.parse(item.presentation_steps) 
            : item.presentation_steps,
          observation_prompts: item.observation_prompts,
          status: progressRecord?.status || 0,
          times_practiced: 0,
          last_practiced: null,
          in_progress: inProgressIds.includes(item.id)
        };
      })
      .sort((a, b) => {
        // Prioritize in-progress items
        if (a.in_progress && !b.in_progress) return -1;
        if (!a.in_progress && b.in_progress) return 1;
        return 0;
      })
      .slice(0, count);

    return NextResponse.json({ activities });
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

    // Default: increment practice count
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
