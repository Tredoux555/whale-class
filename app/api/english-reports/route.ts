// app/api/english-reports/route.ts
// Fetches children and their English progress for weekly reports
// TWO-WAY SYNC: Saving reports also updates child_work_progress
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase credentials:', { url: !!url, key: !!key });
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

// Map work codes to database IDs
const codeToWorkId: Record<string, string> = {
  'BS': 'eng_bs',
  'ES': 'eng_es',
  'MS': 'eng_ms',
  'WBW/a/': 'eng_wbw_a',
  'WBW/e/': 'eng_wbw_e',
  'WBW/i/': 'eng_wbw_i',
  'WBW/o/': 'eng_wbw_o',
  'WBW/u/': 'eng_wbw_u',
  'WFW/a/': 'eng_wfw_a',
  'WFW/e/': 'eng_wfw_e',
  'WFW/i/': 'eng_wfw_i',
  'WFW/o/': 'eng_wfw_o',
  'WFW/u/': 'eng_wfw_u',
  'PR/a/': 'eng_pr_a',
  'PR/e/': 'eng_pr_e',
  'PR/i/': 'eng_pr_i',
  'PR/o/': 'eng_pr_o',
  'PR/u/': 'eng_pr_u',
  'PrPh Red 1': 'eng_prph_1',
  'PrPh Red 2': 'eng_prph_2',
  'PrPh Red 3': 'eng_prph_3',
  'PrPh Red 4': 'eng_prph_4',
  'PrPh Red 5': 'eng_prph_5',
  'PrPh Red 6': 'eng_prph_6',
  'PrPh Red 7': 'eng_prph_7',
  'PrPh Red 8': 'eng_prph_8',
  'PrPh Red 9': 'eng_prph_9',
  'PrPh Red 10': 'eng_prph_10',
  'BL/init/': 'eng_bl_init',
  'BL/final/': 'eng_bl_final',
};

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: childError.message, children: [] }, { status: 500 });
    }

    if (!children || children.length === 0) {
      console.log('No children found in database');
      return NextResponse.json({ 
        children: [], 
        englishWorks: [],
        week,
        year,
        debug: 'No children found'
      });
    }

    console.log(`Found ${children.length} children`);

    // 2. Fetch all English progress for these children
    const childIds = children.map(c => c.id);
    
    const { data: allProgress, error: progressError } = await supabase
      .from('child_work_progress')
      .select('child_id, work_id, status, last_updated, presented_date, practicing_date, mastered_date')
      .in('child_id', childIds)
      .like('work_id', 'eng_%');

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    // 3. Fetch English works from curriculum
    const { data: englishWorks, error: worksError } = await supabase
      .from('curriculum_roadmap')
      .select('id, name')
      .like('id', 'eng_%')
      .order('sequence', { ascending: true });

    if (worksError) {
      console.error('Error fetching works:', worksError);
    }

    // 4. Check for saved weekly logs
    const { data: savedLogs, error: logsError } = await supabase
      .from('english_weekly_log')
      .select('*')
      .in('child_id', childIds)
      .eq('week_number', week)
      .eq('year', year);

    if (logsError) {
      console.error('Error fetching logs:', logsError);
      // Don't fail - just continue without saved logs
    }

    // Create work name lookup
    const workNames: Record<string, string> = {};
    (englishWorks || []).forEach(w => {
      workNames[w.id] = w.name;
    });

    // 5. Group progress by child
    const progressByChild: Record<string, any[]> = {};
    (allProgress || []).forEach(p => {
      if (!progressByChild[p.child_id]) {
        progressByChild[p.child_id] = [];
      }
      
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

    // 7. Build response
    const result = children.map(child => {
      const progress = progressByChild[child.id] || [];
      const thisWeekWorks = progress.filter(p => p.isThisWeek && p.status > 0);
      const savedLog = savedLogsMap[child.id];
      
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
  } catch (error: any) {
    console.error('English reports API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      children: [],
      englishWorks: []
    }, { status: 500 });
  }
}

// Save weekly report AND sync to progress tracker
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { childId, week, year, worksDone, nextWork, reportText } = body;

    if (!childId || !week || !year) {
      return NextResponse.json({ error: 'childId, week, and year required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 1. Save to english_weekly_log
    const { data: logData, error: logError } = await supabase
      .from('english_weekly_log')
      .upsert({
        child_id: childId,
        week_number: week,
        year: year,
        works_done: worksDone || [],
        next_work: nextWork || '',
        report_text: reportText || '',
        updated_at: now,
      }, { onConflict: 'child_id,week_number,year' })
      .select()
      .single();

    if (logError) {
      console.error('Error saving report:', logError);
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // 2. TWO-WAY SYNC: Update child_work_progress for each work done
    if (worksDone && worksDone.length > 0) {
      for (const entry of worksDone) {
        if (!entry.work) continue;
        
        const workId = codeToWorkId[entry.work];
        if (!workId) continue;

        // Map performance to status
        let status = 2;
        if (entry.performance === 'excellent') status = 3;
        else if (entry.performance === 'good') status = 2;
        else if (entry.performance === 'struggled') status = 1;
        else if (entry.performance === 'repeat') status = 1;

        const dateFields: Record<string, string> = {};
        if (status === 1) dateFields.presented_date = now;
        if (status === 2) dateFields.practicing_date = now;
        if (status === 3) dateFields.mastered_date = now;

        await supabase
          .from('child_work_progress')
          .upsert({
            child_id: childId,
            work_id: workId,
            status,
            last_updated: now,
            ...dateFields
          }, { onConflict: 'child_id,work_id' });
      }
    }

    return NextResponse.json({ success: true, log: logData });
  } catch (error: any) {
    console.error('Error in POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
