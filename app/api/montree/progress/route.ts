// /api/montree/progress/route.ts
// GET child progress - inline client creation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const fromDate = searchParams.get('from'); // ISO date string for filtering
    const toDate = searchParams.get('to'); // ISO date string for filtering

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First verify child exists
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('id', childId)
      .single();

    if (childError) {
      console.error('Child lookup error:', childError);
      // Distinguish between "not found" and actual DB errors
      if (childError.code === 'PGRST116') {
        // PGRST116 = .single() found 0 rows → child doesn't exist
        return NextResponse.json({
          error: 'Child not found',
          progress: [],
          stats: { presented: 0, practicing: 0, mastered: 0 },
          byArea: {},
          total: 0,
        }, { status: 404 });
      }
      // Actual database error
      console.error('Database error:', childError.message, childError.code);
      return NextResponse.json({
        error: 'Internal server error',
      }, { status: 500 });
    }

    let query = supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId);

    // Apply date filters if provided
    if (fromDate) {
      query = query.gte('updated_at', fromDate);
    }
    if (toDate) {
      query = query.lte('updated_at', toDate);
    }

    const { data: progress, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Progress fetch error:', error.message, error.code);
      return NextResponse.json({
        progress: [],
        stats: { presented: 0, practicing: 0, mastered: 0 },
        byArea: {},
        total: 0,
      });
    }

    // Also fetch focus works to mark which progress items are focus
    // This is optional - if it fails, we just won't have focus flags
    const focusMap = new Map<string, string>();
    try {
      const { data: focusWorks, error: focusError } = await supabase
        .from('montree_child_focus_works')
        .select('area, work_name')
        .eq('child_id', childId);

      if (!focusError && focusWorks) {
        for (const fw of focusWorks) {
          focusMap.set(fw.area, fw.work_name?.toLowerCase());
        }
      }
    } catch (e) {
      // Focus works fetch failed, continuing without focus flags
    }

    // Calculate stats
    const stats = { presented: 0, practicing: 0, mastered: 0 };
    const byArea: Record<string, any[]> = {};

    for (const p of progress || []) {
      let statusKey = '';
      if (p.status === 1 || p.status === 'presented') {
        statusKey = 'presented';
        stats.presented++;
      } else if (p.status === 2 || p.status === 'practicing') {
        statusKey = 'practicing';
        stats.practicing++;
      } else if (p.status === 3 || p.status === 'mastered') {
        statusKey = 'mastered';
        stats.mastered++;
      }

      const area = p.area || 'other';
      if (!byArea[area]) byArea[area] = [];

      // Check if this progress item is a focus work for its area
      const focusWorkName = focusMap.get(area);
      const isFocus = focusWorkName === p.work_name?.toLowerCase();

      byArea[area].push({ ...p, statusNormalized: statusKey, is_focus: isFocus });
    }

    // Add is_focus to progress array
    const progressWithFocus = (progress || []).map(p => {
      const area = p.area || 'other';
      const focusWorkName = focusMap.get(area);
      const isFocus = focusWorkName === p.work_name?.toLowerCase();
      return { ...p, is_focus: isFocus };
    });

    // Optionally include behavioral observations for timeline view
    const includeObservations = searchParams.get('include_observations') === 'true';
    let observations: unknown[] = [];

    if (includeObservations) {
      try {
        const { data: obs } = await supabase
          .from('montree_behavioral_observations')
          .select('id, behavior_description, antecedent, consequence, environmental_notes, observed_at, time_of_day, activity_during')
          .eq('child_id', childId)
          .order('observed_at', { ascending: false })
          .limit(50);

        observations = obs || [];
      } catch {
        // Table may not exist or be empty — gracefully continue
      }
    }

    return NextResponse.json({
      progress: progressWithFocus,
      stats,
      byArea,
      total: progress?.length || 0,
      ...(includeObservations ? { observations } : {}),
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
