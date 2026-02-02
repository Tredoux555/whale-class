// /api/montree/progress/route.ts
// GET child progress - inline client creation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
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
      // Return empty progress instead of error - child might be new
      return NextResponse.json({
        progress: [],
        stats: { presented: 0, practicing: 0, mastered: 0 },
        byArea: {},
        total: 0,
        debug: `Child not found: ${childId}`
      });
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
      console.error('Progress fetch error:', error);
      return NextResponse.json({
        progress: [],
        stats: { presented: 0, practicing: 0, mastered: 0 },
        byArea: {},
        total: 0,
        debug: `Query error: ${error.message}`
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
      console.warn('Focus works fetch failed, continuing without focus flags:', e);
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

    return NextResponse.json({
      progress: progressWithFocus,
      stats,
      byArea,
      total: progress?.length || 0
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
