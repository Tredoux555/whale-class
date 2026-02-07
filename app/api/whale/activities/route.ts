// app/api/whale/activities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

// GET - Get all activities with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const skillLevel = searchParams.get('skillLevel');
    const age = searchParams.get('age');
    const search = searchParams.get('search');

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('activities')
      .select('*');

    // Apply filters
    if (area && area !== 'all') {
      query = query.eq('area', area);
    }

    if (skillLevel && skillLevel !== 'all') {
      query = query.eq('skill_level', parseInt(skillLevel));
    }

    if (age && age !== 'all') {
      const ageNum = parseFloat(age);
      query = query.lte('age_min', ageNum).gte('age_max', ageNum);
    }

    // Order by
    query = query
      .order('area', { ascending: true })
      .order('skill_level', { ascending: true })
      .order('name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log(`Activities API: Found ${data?.length || 0} activities`);

    // Apply search filter if provided (client-side filtering for simplicity)
    let filteredData = data || [];
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(activity =>
        activity.name.toLowerCase().includes(searchLower) ||
        activity.instructions.toLowerCase().includes(searchLower) ||
        (activity.learning_goals && activity.learning_goals.some((goal: string) =>
          goal.toLowerCase().includes(searchLower)
        ))
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
