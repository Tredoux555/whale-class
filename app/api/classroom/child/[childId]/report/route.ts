import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;

    // Get current week info
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    // Fetch child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, name_chinese, date_of_birth, photo_url')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Fetch all weekly assignments for this child (all time for comprehensive view)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        work_name,
        work_name_chinese,
        area,
        progress_status,
        updated_at
      `)
      .eq('child_id', childId)
      .order('updated_at', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
    }

    const works = assignments || [];

    // Calculate progress by area
    const areaMap: Record<string, { total: number; presented: number; practicing: number; mastered: number }> = {};
    
    works.forEach(work => {
      const area = work.area || 'practical_life';
      if (!areaMap[area]) {
        areaMap[area] = { total: 0, presented: 0, practicing: 0, mastered: 0 };
      }
      areaMap[area].total++;
      if (work.progress_status === 'presented') areaMap[area].presented++;
      if (work.progress_status === 'practicing') areaMap[area].practicing++;
      if (work.progress_status === 'mastered') areaMap[area].mastered++;
    });

    const areaProgress = Object.entries(areaMap).map(([area, stats]) => ({
      area,
      ...stats
    }));

    // Sort areas in standard order
    const areaOrder = ['practical_life', 'sensorial', 'math', 'mathematics', 'language', 'culture', 'cultural'];
    areaProgress.sort((a, b) => {
      const aIdx = areaOrder.indexOf(a.area);
      const bIdx = areaOrder.indexOf(b.area);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    // Calculate total stats
    const totalStats = {
      total: works.length,
      presented: works.filter(w => w.progress_status === 'presented').length,
      practicing: works.filter(w => w.progress_status === 'practicing').length,
      mastered: works.filter(w => w.progress_status === 'mastered').length,
      percentComplete: works.length > 0 
        ? Math.round((works.filter(w => w.progress_status === 'mastered').length / works.length) * 100)
        : 0
    };

    // Get recent works (last 10 updated)
    const recentWorks = works.slice(0, 10).map(w => ({
      id: w.id,
      work_name: w.work_name,
      work_name_chinese: w.work_name_chinese,
      area: w.area,
      progress_status: w.progress_status,
      updated_at: w.updated_at
    }));

    return NextResponse.json({
      child,
      areaProgress,
      recentWorks,
      totalStats,
      weekInfo: {
        week: weekNumber,
        year
      }
    });

  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
