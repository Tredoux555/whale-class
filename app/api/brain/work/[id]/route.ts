// app/api/brain/work/[id]/route.ts
// Get detailed info for a specific work including prerequisites and sensitive periods

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/work/[id]
 * Returns full work details with:
 *   - Prerequisites (required works)
 *   - Sensitive period mappings
 *   - What this work unlocks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Work ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get work details
    const { data: work, error: workError } = await supabase
      .from('montessori_works')
      .select('*')
      .eq('id', id)
      .single();

    if (workError || !work) {
      return NextResponse.json(
        { success: false, error: 'Work not found' },
        { status: 404 }
      );
    }

    // Get prerequisites
    const { data: prerequisites } = await supabase
      .from('work_prerequisites')
      .select(`
        is_required,
        prerequisite:montessori_works!work_prerequisites_prerequisite_work_id_fkey (
          id, name, slug, curriculum_area
        )
      `)
      .eq('work_id', id);

    // Get what this unlocks
    const { data: unlocks } = await supabase
      .from('work_prerequisites')
      .select(`
        is_required,
        work:montessori_works!work_prerequisites_work_id_fkey (
          id, name, slug, curriculum_area
        )
      `)
      .eq('prerequisite_work_id', id);

    // Get sensitive periods
    const { data: sensitivePeriods } = await supabase
      .from('work_sensitive_periods')
      .select(`
        relevance_score,
        sensitive_period:sensitive_periods (
          id, name, slug, age_peak_start, age_peak_end, parent_description
        )
      `)
      .eq('work_id', id);

    return NextResponse.json({
      success: true,
      data: {
        ...work,
        prerequisites: prerequisites?.map((p: any) => ({
          ...p.prerequisite,
          is_required: p.is_required,
        })) || [],
        unlocks: unlocks?.map((u: any) => ({
          ...u.work,
          is_required: u.is_required,
        })) || [],
        sensitive_periods: sensitivePeriods?.map((sp: any) => ({
          ...sp.sensitive_period,
          relevance_score: sp.relevance_score,
        })) || [],
      },
    });
  } catch (error: any) {
    console.error('Error fetching work details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch work' },
      { status: 500 }
    );
  }
}
