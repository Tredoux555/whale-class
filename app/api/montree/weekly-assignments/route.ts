import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Query montree_child_progress - the correct Montree table
    const { data, error } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId)
      .order('area');

    if (error) throw error;

    // Transform to match expected format for dashboard
    const assignments = (data || []).map(item => ({
      id: item.id,
      child_id: item.child_id,
      work_key: item.work_key,
      work_name: item.work_name,
      area: item.area,
      status: item.status || 0,
      current_level: item.current_level || 1,
      max_level: item.max_level || 3,
      notes: item.notes,
      last_updated: item.updated_at,
      created_at: item.created_at
    }));

    return NextResponse.json({
      assignments,
      total: assignments.length
    });

  } catch (error) {
    console.error('Weekly assignments error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
