import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/montree-home/activities - Get recommended activities for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const count = parseInt(searchParams.get('count') || '3');

    if (!childId) {
      return NextResponse.json({ error: 'Child ID is required' }, { status: 400 });
    }

    // Get child's family ID
    const { data: child, error: childError } = await supabase
      .from('home_children')
      .select('family_id')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get recommended activities using the database function
    const { data: activities, error } = await supabase.rpc('get_home_today_activities', {
      p_child_id: childId,
      p_count: count
    });

    if (error) {
      // If function doesn't exist, fallback to direct query
      if (error.code === '42883') {
        const { data: fallbackActivities, error: fallbackError } = await supabase
          .from('home_curriculum')
          .select(`
            id, name, area, category, description, video_url, sequence
          `)
          .eq('family_id', child.family_id)
          .eq('is_active', true)
          .order('area_sequence')
          .order('sequence')
          .limit(count);

        if (fallbackError) {
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }

        // Add status 0 to fallback activities
        const withStatus = (fallbackActivities || []).map(a => ({ ...a, status: 0 }));
        return NextResponse.json({ activities: withStatus });
      }

      console.error('Error fetching activities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// POST /api/montree-home/activities - Update activity progress
export async function POST(request: NextRequest) {
  try {
    const { childId, activityId, action, status, notes } = await request.json();

    if (!childId || !activityId) {
      return NextResponse.json({ error: 'Child ID and Activity ID are required' }, { status: 400 });
    }

    // Get child's family for logging
    const { data: child } = await supabase
      .from('home_children')
      .select('family_id')
      .eq('id', childId)
      .single();

    // Handle different actions
    if (action === 'mark_done') {
      // Mark activity as mastered
      const { data, error } = await supabase
        .from('home_child_progress')
        .upsert({
          child_id: childId,
          curriculum_work_id: activityId,
          status: 3, // mastered
          mastered_date: new Date().toISOString().split('T')[0],
          last_practiced: new Date().toISOString().split('T')[0],
          times_practiced: 1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'child_id,curriculum_work_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error marking done:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      if (child) {
        await supabase.from('home_activity_log').insert({
          family_id: child.family_id,
          child_id: childId,
          activity_type: 'work_completed',
          activity_data: { activity_id: activityId },
        });
      }

      return NextResponse.json({ success: true, progress: data });
    }

    // Update status
    if (status !== undefined) {
      const updateData: Record<string, unknown> = {
        status,
        last_practiced: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };

      // Set appropriate date
      const today = new Date().toISOString().split('T')[0];
      if (status === 1) updateData.presented_date = today;
      if (status === 2) updateData.practicing_date = today;
      if (status === 3) updateData.mastered_date = today;

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('home_child_progress')
        .upsert({
          child_id: childId,
          curriculum_work_id: activityId,
          ...updateData,
        }, {
          onConflict: 'child_id,curriculum_work_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      if (child) {
        await supabase.from('home_activity_log').insert({
          family_id: child.family_id,
          child_id: childId,
          activity_type: 'progress_updated',
          activity_data: { activity_id: activityId, status },
        });
      }

      return NextResponse.json({ success: true, progress: data });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
  } catch (error) {
    console.error('Activities POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
