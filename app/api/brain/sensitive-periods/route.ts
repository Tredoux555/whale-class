// app/api/brain/sensitive-periods/route.ts
// Get sensitive periods with optional age filtering

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/sensitive-periods
 * Query params:
 *   - age: Filter to show which sensitive periods are active at this age
 *   - peak_only: If "true" and age provided, only return periods at peak
 * 
 * Returns sensitive periods with their age ranges and observable behaviors
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ageParam = searchParams.get('age');
    const peakOnly = searchParams.get('peak_only') === 'true';

    const supabase = createClient();

    const { data: periods, error } = await supabase
      .from('sensitive_periods')
      .select('*')
      .order('age_peak_start');

    if (error) {
      console.error('Error fetching sensitive periods:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // If age provided, filter and annotate
    if (ageParam) {
      const age = parseFloat(ageParam);
      if (isNaN(age)) {
        return NextResponse.json(
          { success: false, error: 'age must be a valid number' },
          { status: 400 }
        );
      }

      const annotated = periods?.map(period => {
        const isActive = age >= period.age_start && age <= period.age_end;
        const isPeak = age >= period.age_peak_start && age <= period.age_peak_end;
        
        return {
          ...period,
          status: isPeak ? 'peak' : isActive ? 'active' : 'inactive',
          is_peak: isPeak,
          is_active: isActive,
        };
      }).filter(p => peakOnly ? p.is_peak : p.is_active);

      return NextResponse.json({
        success: true,
        child_age: age,
        filter: peakOnly ? 'peak_only' : 'active',
        count: annotated?.length || 0,
        data: annotated,
      });
    }

    return NextResponse.json({
      success: true,
      count: periods?.length || 0,
      data: periods,
    });
  } catch (error: any) {
    console.error('Error in brain/sensitive-periods:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sensitive periods' },
      { status: 500 }
    );
  }
}
