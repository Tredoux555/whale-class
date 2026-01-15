// app/api/english-reports/route.ts
// Fetches children and their English progress for weekly reports
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
  const week = parseInt(searchParams.get('week') || '0');
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  // Calculate date range for the week
  const startOfYear = new Date(year, 0, 1);
  const weekStart = new Date(startOfYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Fetch all active children
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('id, name, gender, display_order')
    .eq('active_status', true)
    .order('display_order', { ascending: true });

  if (childError) {
    console.error('Error fetching children:', childError);
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  // 2. Fetch all English progress for these children
  // English works have IDs starting with 'eng_'
  const childIds = (children || []).map(c => c.id);
  
  const { data: allProgress, error: progressError } = await supabase
    .from('child_work_progress')
    .select('child_id, work_id, status, last_updated, presented_date, practicing_date, mastered_date')
    .in('child_id', childIds)
    .like('work_id', 'eng_%');

  if (progressError) {
    console.error('Error fetching progress:', progressError);
  }

  // 3. Fetch English works from curriculum
  const { data: englishWorks } = await supabase
    .from('curriculum_roadmap')
    .select('id, name')
    .like('id', 'eng_%')
    .order('sequence', { ascending: true });

  // 4. Check for saved weekly logs
  const { data: savedLogs } = await supabase
    .from('english_weekly_log')
    .select('*')
    .in('child_id', childIds)
    .eq('week_number', week)
    .eq('year', year);

  // Create work name lookup
  const workNames: Record<string, string> = {};
  (englishWorks || []).forEach(w => {
    workNames[w.id] = w.name;
  });

  // 5. Group progress by child and find what was done THIS WEEK
  const progressByChild: Record<string, any[]> = {};
  (allProgress || []).forEach(p => {
    if (!progressByChild[p.child_id]) {
      progressByChild[p.child_id] = [];
    }
    
    // Check if this work was updated this week
    const updatedAt = new Date(p.last_updated);
    const isThisWeek = updatedAt >= weekStart && updatedAt < weekEnd;
    
    progressByChild[p.child_id].push({
      ...p,
      workName: workNames[p.work_id] || p.work_id,
      isThisWeek,
    });
  });

  // 6. Get saved logs lookup
  const savedLogsMap: Record<string, any> = {};
  (savedLogs || []).forEach(log => {
    savedLogsMap[log.child_id] = log;
  });

  // 7. Build response with children and their progress
  const result = (children || []).map(child => {
    const progress = progressByChild[child.id] || [];
    const thisWeekWorks = progress.filter(p => p.isThisWeek && p.status > 0);
    const savedLog = savedLogsMap[child.id];
    
    // Find highest status work as "current work"
    const currentWork = progress
      .filter(p => p.status > 0)
      .sort((a, b) => b.status - a.status || new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())[0];

    return {
      id: child.id,
      name: child.name,
      gender: child.gender || 'they',
      order: child.display_order,
      currentWork: currentWork?.workName || null,
      thisWeekWorks: thisWeekWorks.map(w => ({
        id: w.work_id,
        name: w.workName,
        status: w.status,
        updatedAt: w.last_updated,
      })),
      allProgress: progress,
      savedLog: savedLog || null,
    };
  });

  return NextResponse.json({ 
    children: result,
    englishWorks: englishWorks || [],
    week,
    year,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  });
}

// Save weekly report
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { childId, week, year, worksDone, nextWork, reportText } = body;

  if (!childId || !week || !year) {
    return NextResponse.json({ error: 'childId, week, and year required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('english_weekly_log')
    .upsert({
      child_id: childId,
      week_number: week,
      year: year,
      works_done: worksDone || [],
      next_work: nextWork || '',
      report_text: reportText || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'child_id,week_number,year' })
    .select()
    .single();

  if (error) {
    console.error('Error saving report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, log: data });
}
