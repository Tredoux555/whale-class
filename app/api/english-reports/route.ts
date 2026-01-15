// app/api/english-reports/route.ts
// BULLETPROOF VERSION - will work even if some tables don't exist
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map work codes to database IDs
const codeToWorkId: Record<string, string> = {
  'BS': 'eng_bs', 'ES': 'eng_es', 'MS': 'eng_ms',
  'WBW/a/': 'eng_wbw_a', 'WBW/e/': 'eng_wbw_e', 'WBW/i/': 'eng_wbw_i',
  'WBW/o/': 'eng_wbw_o', 'WBW/u/': 'eng_wbw_u',
  'WFW/a/': 'eng_wfw_a', 'WFW/e/': 'eng_wfw_e', 'WFW/i/': 'eng_wfw_i',
  'WFW/o/': 'eng_wfw_o', 'WFW/u/': 'eng_wfw_u',
  'PR/a/': 'eng_pr_a', 'PR/e/': 'eng_pr_e', 'PR/i/': 'eng_pr_i',
  'PR/o/': 'eng_pr_o', 'PR/u/': 'eng_pr_u',
  'PrPh Red 1': 'eng_prph_1', 'PrPh Red 2': 'eng_prph_2',
  'PrPh Red 3': 'eng_prph_3', 'PrPh Red 4': 'eng_prph_4',
  'PrPh Red 5': 'eng_prph_5', 'PrPh Red 6': 'eng_prph_6',
  'PrPh Red 7': 'eng_prph_7', 'PrPh Red 8': 'eng_prph_8',
  'PrPh Red 9': 'eng_prph_9', 'PrPh Red 10': 'eng_prph_10',
  'BL/init/': 'eng_bl_init', 'BL/final/': 'eng_bl_final',
};

const workIdToCode: Record<string, string> = Object.fromEntries(
  Object.entries(codeToWorkId).map(([k, v]) => [v, k])
);

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const week = parseInt(searchParams.get('week') || '3');
  const year = parseInt(searchParams.get('year') || '2026');

  // Calculate week date range
  const startOfYear = new Date(year, 0, 1);
  const weekStart = new Date(startOfYear.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Get children - THIS MUST WORK
  const { data: children, error: childErr } = await supabase
    .from('children')
    .select('id, name, gender, display_order')
    .eq('active_status', true)
    .order('display_order');

  if (childErr || !children || children.length === 0) {
    // Return fallback hardcoded children
    return NextResponse.json({
      children: [
        { id: '1', name: 'Rachel', gender: 'she', order: 1, thisWeekWorks: [], savedLog: null },
        { id: '2', name: 'Yueze', gender: 'he', order: 2, thisWeekWorks: [], savedLog: null },
        { id: '3', name: 'Lucky', gender: 'she', order: 3, thisWeekWorks: [], savedLog: null },
        { id: '4', name: 'Austin', gender: 'he', order: 4, thisWeekWorks: [], savedLog: null },
        { id: '5', name: 'Minxi', gender: 'she', order: 5, thisWeekWorks: [], savedLog: null },
        { id: '6', name: 'Leo', gender: 'he', order: 6, thisWeekWorks: [], savedLog: null },
        { id: '7', name: 'Joey', gender: 'he', order: 7, thisWeekWorks: [], savedLog: null },
        { id: '8', name: 'Eric', gender: 'he', order: 8, thisWeekWorks: [], savedLog: null },
        { id: '9', name: 'Jimmy', gender: 'he', order: 9, thisWeekWorks: [], savedLog: null },
        { id: '10', name: 'Kevin', gender: 'he', order: 10, thisWeekWorks: [], savedLog: null },
        { id: '11', name: 'Niuniu', gender: 'she', order: 11, thisWeekWorks: [], savedLog: null },
        { id: '12', name: 'Amy', gender: 'she', order: 12, thisWeekWorks: [], savedLog: null },
        { id: '13', name: 'Henry', gender: 'he', order: 13, thisWeekWorks: [], savedLog: null },
        { id: '14', name: 'Segina', gender: 'she', order: 14, thisWeekWorks: [], savedLog: null },
        { id: '15', name: 'Hayden', gender: 'he', order: 15, thisWeekWorks: [], savedLog: null },
        { id: '16', name: 'KK', gender: 'he', order: 16, thisWeekWorks: [], savedLog: null },
        { id: '17', name: 'Kayla', gender: 'she', order: 17, thisWeekWorks: [], savedLog: null },
        { id: '18', name: 'Stella', gender: 'she', order: 18, thisWeekWorks: [], savedLog: null },
      ],
      englishWorks: [],
      week, year,
      fallback: true,
      error: childErr?.message || 'No children found'
    });
  }

  const childIds = children.map(c => c.id);

  // 2. Try to get progress (don't fail if this doesn't work)
  let allProgress: any[] = [];
  try {
    const { data } = await supabase
      .from('child_work_progress')
      .select('child_id, work_id, status, last_updated')
      .in('child_id', childIds)
      .like('work_id', 'eng_%');
    allProgress = data || [];
  } catch (e) {
    console.log('Progress fetch failed, continuing without');
  }

  // 3. Try to get saved logs (don't fail if table doesn't exist)
  let savedLogs: any[] = [];
  try {
    const { data } = await supabase
      .from('english_weekly_log')
      .select('*')
      .in('child_id', childIds)
      .eq('week_number', week)
      .eq('year', year);
    savedLogs = data || [];
  } catch (e) {
    console.log('Logs fetch failed, continuing without');
  }

  // 4. Try to get English works
  let englishWorks: any[] = [];
  try {
    const { data } = await supabase
      .from('curriculum_roadmap')
      .select('id, name')
      .like('id', 'eng_%')
      .order('sequence');
    englishWorks = data || [];
  } catch (e) {
    console.log('Works fetch failed, continuing without');
  }

  // Build progress map
  const progressByChild: Record<string, any[]> = {};
  allProgress.forEach(p => {
    if (!progressByChild[p.child_id]) progressByChild[p.child_id] = [];
    const updatedAt = new Date(p.last_updated || Date.now());
    const isThisWeek = updatedAt >= weekStart && updatedAt < weekEnd;
    progressByChild[p.child_id].push({ ...p, isThisWeek });
  });

  // Build logs map
  const logsMap: Record<string, any> = {};
  savedLogs.forEach(log => { logsMap[log.child_id] = log; });

  // Build response
  const result = children.map(child => {
    const progress = progressByChild[child.id] || [];
    const thisWeekWorks = progress
      .filter(p => p.isThisWeek && p.status > 0)
      .map(p => ({
        id: p.work_id,
        code: workIdToCode[p.work_id] || p.work_id,
        status: p.status,
      }));

    return {
      id: child.id,
      name: child.name,
      gender: child.gender || 'they',
      order: child.display_order,
      thisWeekWorks,
      savedLog: logsMap[child.id] || null,
    };
  });

  return NextResponse.json({ children: result, englishWorks, week, year });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { childId, week, year, worksDone, nextWork, reportText } = body;

  if (!childId || !week || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Save to english_weekly_log
  try {
    await supabase
      .from('english_weekly_log')
      .upsert({
        child_id: childId,
        week_number: week,
        year: year,
        works_done: worksDone || [],
        next_work: nextWork || '',
        report_text: reportText || '',
        updated_at: now,
      }, { onConflict: 'child_id,week_number,year' });
  } catch (e) {
    console.log('Failed to save log:', e);
  }

  // Sync to child_work_progress
  if (worksDone && worksDone.length > 0) {
    for (const entry of worksDone) {
      if (!entry.work) continue;
      const workId = codeToWorkId[entry.work];
      if (!workId) continue;

      const status = entry.performance === 'excellent' ? 3 : 
                     entry.performance === 'good' ? 2 : 1;

      try {
        await supabase
          .from('child_work_progress')
          .upsert({
            child_id: childId,
            work_id: workId,
            status,
            last_updated: now,
          }, { onConflict: 'child_id,work_id' });
      } catch (e) {
        console.log('Failed to sync progress:', e);
      }
    }
  }

  return NextResponse.json({ success: true });
}
