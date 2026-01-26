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
    const weekNumber = searchParams.get('week') || getCurrentWeek();
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('weekly_assignments')
      .select('*')
      .eq('child_id', childId)
      .eq('week_number', parseInt(weekNumber))
      .eq('year', parseInt(year))
      .order('area');

    if (error) throw error;

    return NextResponse.json({
      assignments: data || [],
      week: parseInt(weekNumber),
      year: parseInt(year),
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Weekly assignments error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek).toString();
}
