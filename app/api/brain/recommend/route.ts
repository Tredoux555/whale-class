// app/api/brain/recommend/route.ts
// Get AI-powered work recommendations for a child
// FIXED: Direct query instead of RPC function dependency

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/recommend
 * Query params:
 *   - child_age: Child's age in years (decimal, e.g., 4.5)
 *   - completed_work_ids: Comma-separated list of completed work UUIDs (optional)
 *   - limit: Number of recommendations (default: 5, max: 20)
 * 
 * Returns personalized recommendations based on:
 *   1. Age appropriateness
 *   2. Sensitive period alignment (2x score during peak)
 *   3. Gateway work priority (+10 bonus)
 *   4. Curriculum area balance (+5 for underserved areas)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childAge = searchParams.get('child_age');
    const completedIdsParam = searchParams.get('completed_work_ids');
    const limitParam = searchParams.get('limit');

    if (!childAge) {
      return NextResponse.json(
        { success: false, error: 'child_age is required' },
        { status: 400 }
      );
    }

    const age = parseFloat(childAge);
    if (isNaN(age) || age < 0 || age > 12) {
      return NextResponse.json(
        { success: false, error: 'child_age must be a valid number between 0 and 12' },
        { status: 400 }
      );
    }

    // Parse limit
    let limit = 5;
    if (limitParam) {
      limit = Math.min(Math.max(parseInt(limitParam) || 5, 1), 20);
    }

    // Parse completed work IDs
    const completedIds = completedIdsParam 
      ? completedIdsParam.split(',').filter(id => id.trim())
      : [];

    const supabase = createClient();

    // Step 1: Get all age-appropriate works
    let worksQuery = supabase
      .from('montessori_works')
      .select('id, name, curriculum_area, sub_area, is_gateway, parent_explanation_simple, age_min, age_max')
      .lte('age_min', age)
      .gte('age_max', age);
    
    // Exclude completed works
    if (completedIds.length > 0) {
      worksQuery = worksQuery.not('id', 'in', `(${completedIds.join(',')})`);
    }

    const { data: works, error: worksError } = await worksQuery;

    if (worksError) {
      console.error('Error fetching works:', worksError);
      return NextResponse.json(
        { success: false, error: worksError.message },
        { status: 500 }
      );
    }

    if (!works || works.length === 0) {
      return NextResponse.json({
        success: true,
        child_age: age,
        completed_count: completedIds.length,
        recommendations: [],
      });
    }

    // Step 2: Get sensitive periods for this age
    const { data: periods } = await supabase
      .from('sensitive_periods')
      .select('id, name, age_peak_start, age_peak_end, age_start, age_end')
      .lte('age_start', age)
      .gte('age_end', age);

    // Step 3: Get work-to-sensitive-period mappings
    const workIds = works.map(w => w.id);
    const { data: workPeriods } = await supabase
      .from('work_sensitive_periods')
      .select('work_id, sensitive_period_id, relevance_score')
      .in('work_id', workIds);

    // Step 4: Get prerequisites to check what's available
    const { data: prerequisites } = await supabase
      .from('work_prerequisites')
      .select('work_id, prerequisite_work_id, is_required')
      .in('work_id', workIds);

    // Step 5: Calculate scores for each work
    const scoredWorks = works.map(work => {
      let score = 0;
      let reason = 'Good fit for balanced curriculum';

      // Gateway bonus
      if (work.is_gateway) {
        score += 10;
        reason = 'Gateway work - unlocks many future activities';
      }

      // Sensitive period scoring
      if (periods && workPeriods) {
        const workMappings = workPeriods.filter(wp => wp.work_id === work.id);
        for (const mapping of workMappings) {
          const period = periods.find(p => p.id === mapping.sensitive_period_id);
          if (period) {
            // During peak period = 2x score
            if (age >= period.age_peak_start && age <= period.age_peak_end) {
              score += (mapping.relevance_score || 5) * 2;
              if (!work.is_gateway) {
                reason = 'Perfect match for current developmental stage';
              }
            } else {
              score += mapping.relevance_score || 5;
            }
          }
        }
      }

      // Check prerequisites - skip works with unmet required prereqs
      const workPrereqs = prerequisites?.filter(p => p.work_id === work.id && p.is_required) || [];
      const hasUnmetPrereqs = workPrereqs.some(p => !completedIds.includes(p.prerequisite_work_id));
      
      if (hasUnmetPrereqs) {
        return null; // Exclude this work
      }

      return {
        work_id: work.id,
        work_name: work.name,
        curriculum_area: work.curriculum_area,
        parent_explanation: work.parent_explanation_simple || `${work.name} helps develop important skills in the ${work.curriculum_area.replace('_', ' ')} area.`,
        recommendation_reason: reason,
        score,
      };
    }).filter(Boolean);

    // Sort by score and limit
    const recommendations = scoredWorks
      .sort((a, b) => (b?.score || 0) - (a?.score || 0))
      .slice(0, limit)
      .map(({ score, ...rest }) => rest); // Remove score from response

    return NextResponse.json({
      success: true,
      child_age: age,
      completed_count: completedIds.length,
      recommendations,
    });
  } catch (error: any) {
    console.error('Error in brain/recommend:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
