// /api/montree/parent/milestones/route.ts
// Fetch child milestones and achievements timeline

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural Studies'
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get mastered works with dates (these are milestones)
    const { data: progress, error } = await supabase
      .from('montree_child_progress')
      .select(`
        id,
        status,
        mastery_date,
        created_at,
        updated_at,
        work:work_id (
          name,
          area_id
        )
      `)
      .eq('child_id', childId)
      .in('status', ['mastered', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('Milestones query error:', error.message);
      return NextResponse.json({
        success: true,
        milestones: []
      });
    }

    // Transform to milestones format
    const milestones = (progress || [])
      .filter(p => p.work)
      .map(p => ({
        id: p.id,
        type: 'mastery',
        title: `Mastered: ${(p.work as any).name}`,
        area: (p.work as any).area_id,
        area_label: AREA_LABELS[(p.work as any).area_id] || 'Other',
        date: p.mastery_date || p.updated_at,
        icon: p.status === 'mastered' ? '⭐' : '✓'
      }));

    // Group by month for timeline display
    const grouped: Record<string, typeof milestones> = {};
    milestones.forEach(m => {
      const date = new Date(m.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    // Convert to sorted array
    const timeline = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        items
      }));

    return NextResponse.json({
      success: true,
      milestones,
      timeline,
      total_milestones: milestones.length
    });

  } catch (error) {
    console.error('Milestones API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
