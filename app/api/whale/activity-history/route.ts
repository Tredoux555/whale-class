// app/api/whale/activity-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// GET - Get activity history for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const area = searchParams.get('area'); // Optional filter by curriculum area

    if (!childId) {
      return NextResponse.json(
        { error: 'childId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Build query
    let query = supabase
      .from('daily_activity_assignments')
      .select(`
        *,
        activity:activities(*)
      `)
      .eq('child_id', childId)
      .order('assigned_date', { ascending: false })
      .limit(limit);

    // Add area filter if provided
    if (area) {
      query = query.eq('activity.area', area);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate summary stats
    const completed = data?.filter(a => a.completed).length || 0;
    const total = data?.length || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    // Group by area
    const byArea: Record<string, any> = {};
    data?.forEach(assignment => {
      const areaName = assignment.activity.area;
      if (!byArea[areaName]) {
        byArea[areaName] = {
          total: 0,
          completed: 0,
          activities: []
        };
      }
      byArea[areaName].total++;
      if (assignment.completed) {
        byArea[areaName].completed++;
      }
      byArea[areaName].activities.push(assignment);
    });

    return NextResponse.json({
      success: true,
      data: {
        history: data || [],
        summary: {
          total,
          completed,
          completionRate,
          byArea
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching activity history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity history' },
      { status: 500 }
    );
  }
}
