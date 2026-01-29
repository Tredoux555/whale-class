import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const { reportId } = params;

  if (!reportId) {
    return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Get report with child info
    const { data: report, error: reportError } = await supabase
      .from('montree_weekly_reports')
      .select(`
        id, week_number, year, parent_summary,
        highlights, areas_of_growth, recommendations,
        created_at, child_id
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get child info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('name, nickname')
      .eq('id', report.child_id)
      .single();

    if (childError) throw childError;

    // Get works completed that week
    const startOfWeek = getWeekStart(report.year, report.week_number);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const { data: progress, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, updated_at')
      .eq('child_id', report.child_id)
      .gte('updated_at', startOfWeek.toISOString())
      .lt('updated_at', endOfWeek.toISOString());

    // Get work names - progress table already has work_name and area
    let worksCompleted: any[] = [];
    if (progress && progress.length > 0) {
      worksCompleted = progress.map(p => ({
        work_name: p.work_name,
        area: p.area || 'unknown',
        status: p.status,
        completed_at: p.updated_at
      }));
    }

    return NextResponse.json({
      report: {
        ...report,
        child,
        works_completed: worksCompleted
      }
    });
  } catch (error: any) {
    console.error('Get report error:', error);
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
  }
}

function getWeekStart(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() + daysOffset - jan1.getDay() + 1);
  return weekStart;
}
