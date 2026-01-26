import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
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

    // Group by area for display
    const byArea: Record<string, any[]> = {};
    const areaConfig: Record<string, { icon: string; color: string }> = {
      practical_life: { icon: '🧹', color: '#22c55e' },
      sensorial: { icon: '👁️', color: '#f97316' },
      math: { icon: '🔢', color: '#3b82f6' },
      language: { icon: '📚', color: '#ec4899' },
      cultural: { icon: '🌍', color: '#8b5cf6' },
    };

    (data || []).forEach(assignment => {
      const area = assignment.area || 'other';
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push({
        ...assignment,
        areaConfig: areaConfig[area] || { icon: '📋', color: '#666' }
      });
    });

    return NextResponse.json({
      assignments: data || [],
      byArea,
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
