// API: Get children with progress summary
// Returns children list with curriculum progress percentages

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const schoolSlug = url.searchParams.get('school') || 'beijing-international';

    // Get school
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('slug', schoolSlug)
      .single();

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get children for this school
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .eq('school_id', school.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Children query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get progress summary for all children in one query
    // Count assignments by status for each child
    const childIds = (children || []).map(c => c.id);
    
    let progressMap: Record<string, { total: number; practiced: number; mastered: number }> = {};
    
    if (childIds.length > 0) {
      const { data: assignments } = await supabase
        .from('weekly_assignments')
        .select('child_id, progress_status')
        .in('child_id', childIds);

      // Aggregate progress by child
      if (assignments) {
        for (const a of assignments) {
          if (!progressMap[a.child_id]) {
            progressMap[a.child_id] = { total: 0, practiced: 0, mastered: 0 };
          }
          progressMap[a.child_id].total++;
          if (a.progress_status === 'practicing' || a.progress_status === 'mastered') {
            progressMap[a.child_id].practiced++;
          }
          if (a.progress_status === 'mastered') {
            progressMap[a.child_id].mastered++;
          }
        }
      }
    }

    // Enrich children with progress
    const enrichedChildren = (children || []).map(child => {
      const progress = progressMap[child.id] || { total: 0, practiced: 0, mastered: 0 };
      const progressPercent = progress.total > 0 
        ? Math.round((progress.practiced / progress.total) * 100) 
        : 0;
      
      return {
        ...child,
        progress: {
          total: progress.total,
          practiced: progress.practiced,
          mastered: progress.mastered,
          percent: progressPercent,
        }
      };
    });

    return NextResponse.json({
      school,
      children: enrichedChildren,
      total: enrichedChildren.length
    });

  } catch (error) {
    console.error('Failed to fetch children:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
