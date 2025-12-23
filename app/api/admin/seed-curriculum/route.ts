// =====================================================
// API: Seed curriculum roadmap data
// =====================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase';
import { CURRICULUM_ROADMAP_SEED } from '@/lib/curriculum/roadmap-seed';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createClient();

    // Check if data already exists
    const { data: existing } = await supabase
      .from('curriculum_roadmap')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Curriculum data already exists. Delete existing data first to re-seed.',
        existingCount: existing.length,
      });
    }

    console.log(`Seeding ${CURRICULUM_ROADMAP_SEED.length} curriculum works...`);

    // Insert all curriculum works
    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .insert(CURRICULUM_ROADMAP_SEED)
      .select();

    if (error) {
      console.error('Error seeding curriculum:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to seed curriculum' },
        { status: 500 }
      );
    }

    // Calculate breakdown by stage
    const stageCounts: Record<string, number> = {};
    CURRICULUM_ROADMAP_SEED.forEach((work) => {
      stageCounts[work.stage] = (stageCounts[work.stage] || 0) + 1;
    });

    // Calculate breakdown by area
    const areaCounts: Record<string, number> = {};
    CURRICULUM_ROADMAP_SEED.forEach((work) => {
      areaCounts[work.area] = (areaCounts[work.area] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${data.length} curriculum works!`,
      count: data.length,
      breakdown: {
        byStage: stageCounts,
        byArea: areaCounts,
      },
    });
  } catch (error) {
    console.error('Seed curriculum error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: Check if curriculum is seeded
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, work_name, area, stage')
      .order('sequence_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      seeded: (data?.length || 0) > 0,
      count: data?.length || 0,
      works: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}










