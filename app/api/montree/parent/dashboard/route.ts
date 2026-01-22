// /api/montree/parent/dashboard/route.ts
// Fetch parent dashboard data - child info, progress, media, reports
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const AREAS = [
  { id: 'practical_life', name: 'Practical Life' },
  { id: 'sensorial', name: 'Sensorial' },
  { id: 'mathematics', name: 'Mathematics' },
  { id: 'language', name: 'Language' },
  { id: 'cultural', name: 'Cultural' },
];

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('parent_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Validate session and get child_id
    const { data: session, error: sessionError } = await supabase
      .from('parent_sessions')
      .select('child_id, expires_at')
      .eq('token', sessionToken)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('parent_sessions').delete().eq('token', sessionToken);
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
    }

    const childId = session.child_id;

    // Fetch child info
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, photo_url, date_of_birth')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const birthDate = new Date(child.date_of_birth);
      const today = new Date();
      age = ((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    }

    // Fetch progress stats from weekly_assignments
    const { data: assignments } = await supabase
      .from('weekly_assignments')
      .select('progress_status, area')
      .eq('child_id', childId);

    const progress = {
      presented: 0,
      practicing: 0,
      mastered: 0,
      total: 0,
    };

    const areaStats: Record<string, { presented: number; practicing: number; mastered: number; total: number }> = {};
    AREAS.forEach(a => {
      areaStats[a.id] = { presented: 0, practicing: 0, mastered: 0, total: 0 };
    });

    (assignments || []).forEach((a: any) => {
      progress.total++;
      const area = a.area || 'practical_life';
      if (areaStats[area]) areaStats[area].total++;

      if (a.progress_status === 'mastered') {
        progress.mastered++;
        if (areaStats[area]) areaStats[area].mastered++;
      } else if (a.progress_status === 'practicing') {
        progress.practicing++;
        if (areaStats[area]) areaStats[area].practicing++;
      } else if (a.progress_status === 'presented') {
        progress.presented++;
        if (areaStats[area]) areaStats[area].presented++;
      }
    });

    const areaProgress = AREAS.map(a => ({
      ...a,
      ...areaStats[a.id],
    })).filter(a => a.total > 0);

    // Fetch recent media
    const { data: media } = await supabase
      .from('child_media')
      .select('id, media_url, media_type, work_name, taken_at')
      .eq('child_id', childId)
      .order('taken_at', { ascending: false })
      .limit(12);

    // Fetch recent reports
    const { data: reports } = await supabase
      .from('montree_weekly_reports')
      .select('id, week_start, week_end, status')
      .eq('child_id', childId)
      .order('week_start', { ascending: false })
      .limit(5);

    // Get share tokens for reports
    const reportIds = (reports || []).map(r => r.id);
    let shareTokens: Record<string, string> = {};
    
    if (reportIds.length > 0) {
      const { data: tokens } = await supabase
        .from('report_share_tokens')
        .select('report_id, token')
        .in('report_id', reportIds)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString());

      (tokens || []).forEach((t: any) => {
        shareTokens[t.report_id] = t.token;
      });
    }

    const reportsWithTokens = (reports || []).map(r => ({
      ...r,
      share_token: shareTokens[r.id] || null,
    }));

    return NextResponse.json({
      success: true,
      child: {
        ...child,
        age: age ? parseFloat(age) : null,
      },
      progress,
      areaProgress,
      recentMedia: media || [],
      reports: reportsWithTokens,
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
