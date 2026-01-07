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
  const familyId = searchParams.get('family_id');
  const includeProgress = searchParams.get('include_progress') === 'true';

  try {
    let query = supabase
      .from('home_children')
      .select('*')
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const { data: children, error } = await query;
    if (error) throw error;

    if (!includeProgress) {
      return NextResponse.json({ children: children || [] });
    }

    // Get total curriculum count
    const { count: totalWorks } = await supabase
      .from('home_curriculum_master')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get all progress records for these children
    const childIds = (children || []).map(c => c.id);
    const { data: allProgress } = await supabase
      .from('home_child_progress')
      .select('*')
      .in('child_id', childIds);

    // Get curriculum areas for grouping
    const { data: curriculum } = await supabase
      .from('home_curriculum_master')
      .select('id, area')
      .eq('is_active', true);

    const curriculumMap = new Map((curriculum || []).map(c => [c.id, c.area]));

    // Calculate progress for each child
    const childrenWithProgress = (children || []).map((child) => {
      const childProgress = (allProgress || []).filter(p => p.child_id === child.id);
      
      const mastered = childProgress.filter(p => p.status === 3).length;
      const practicing = childProgress.filter(p => p.status === 2).length;
      const presented = childProgress.filter(p => p.status === 1).length;

      // Group by area
      const byArea: Record<string, { total: number; mastered: number; practicing: number; presented: number }> = {};
      
      const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
      areas.forEach(area => {
        const areaItems = (curriculum || []).filter(c => c.area === area);
        const areaProgress = childProgress.filter(p => curriculumMap.get(p.curriculum_work_id) === area);
        
        byArea[area] = {
          total: areaItems.length,
          mastered: areaProgress.filter(p => p.status === 3).length,
          practicing: areaProgress.filter(p => p.status === 2).length,
          presented: areaProgress.filter(p => p.status === 1).length
        };
      });

      return {
        ...child,
        progress_summary: {
          total_works: totalWorks || 250,
          mastered,
          practicing,
          presented,
          overall_percent: totalWorks ? Math.round((mastered / totalWorks) * 100) : 0,
          by_area: byArea
        }
      };
    });

    return NextResponse.json({ children: childrenWithProgress });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { family_id, name, birth_date, color } = body;

    if (!family_id || !name || !birth_date) {
      return NextResponse.json(
        { error: 'family_id, name, and birth_date required' },
        { status: 400 }
      );
    }

    const { data: child, error } = await supabase
      .from('home_children')
      .insert({
        family_id,
        name,
        birth_date,
        color: color || '#4F46E5'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ child });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating child:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('home_children')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting child:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
