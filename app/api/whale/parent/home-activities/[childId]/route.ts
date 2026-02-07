// app/api/whale/parent/home-activities/[childId]/route.ts
// Get all home connection activities for a child's works

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  try {
    // Verify parent has access
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', childId)
      .eq('parent_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get all completed and in-progress works for this child
    const { data: completions } = await supabase
      .from('child_work_completion')
      .select('work_id, status, current_level, max_level')
      .eq('child_id', childId)
      .in('status', ['completed', 'in_progress']);

    const workIds = completions?.map(c => c.work_id).filter(Boolean) || [];

    if (workIds.length === 0) {
      return NextResponse.json({
        child,
        activities: [],
        stats: { total: 0, byArea: {} }
      });
    }

    // Get work details with home connections
    const { data: works } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, area_id, parent_description, why_it_matters, home_connection')
      .in('id', workIds)
      .not('home_connection', 'is', null);

    // Get area details
    const areaIds = [...new Set(works?.map(w => w.area_id).filter(Boolean) || [])];
    const { data: areas } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon')
      .in('id', areaIds);

    // Combine data
    const activities = works?.map(work => {
      const completion = completions?.find(c => c.work_id === work.id);
      const area = areas?.find(a => a.id === work.area_id);
      return {
        work_id: work.id,
        work_name: work.name,
        status: completion?.status || 'unknown',
        progress: completion ? `${completion.current_level}/${completion.max_level}` : null,
        area_name: area?.name || 'General',
        area_color: area?.color || '#666',
        area_icon: area?.icon || '📚',
        parent_description: work.parent_description,
        why_it_matters: work.why_it_matters,
        home_connection: work.home_connection,
      };
    }).sort((a, b) => {
      // Sort by area, then by status (in_progress first)
      if (a.area_name !== b.area_name) return a.area_name.localeCompare(b.area_name);
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      return a.work_name.localeCompare(b.work_name);
    }) || [];

    // Calculate stats by area
    const byArea: Record<string, number> = {};
    activities.forEach(a => {
      byArea[a.area_name] = (byArea[a.area_name] || 0) + 1;
    });

    return NextResponse.json({
      child,
      activities,
      stats: {
        total: activities.length,
        byArea,
      }
    });

  } catch (error) {
    console.error('Error fetching home activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch home activities' },
      { status: 500 }
    );
  }
}
