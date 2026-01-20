// app/api/brain/works/route.ts
// List all Montessori works from the brain

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/works
 * Query params:
 *   - area: Filter by curriculum area (practical_life, sensorial, mathematics, language, cultural)
 *   - age: Filter by age (returns works where age is between age_min and age_max)
 *   - gateway_only: If "true", only return gateway works
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const age = searchParams.get('age');
    const gatewayOnly = searchParams.get('gateway_only') === 'true';

    const supabase = createClient();

    let query = supabase
      .from('montessori_works')
      .select('*')
      .order('curriculum_area')
      .order('sequence_order');

    // Apply filters
    if (area) {
      query = query.eq('curriculum_area', area);
    }

    if (age) {
      const ageNum = parseFloat(age);
      query = query.lte('age_min', ageNum).gte('age_max', ageNum);
    }

    if (gatewayOnly) {
      query = query.eq('is_gateway', true);
    }

    const { data: works, error } = await query;

    if (error) {
      console.error('Error fetching works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: works?.length || 0,
      data: works,
    });
  } catch (error: any) {
    console.error('Error in brain/works:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch works' },
      { status: 500 }
    );
  }
}
