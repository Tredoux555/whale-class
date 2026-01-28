// /api/montree/progress/route.ts
// GET child progress - inline client creation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: progress, error } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Progress fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
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
      byArea[area].push({ ...p, statusNormalized: statusKey });
    }

    return NextResponse.json({ 
      progress: progress || [],
      stats,
      byArea,
      total: progress?.length || 0
    });

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
