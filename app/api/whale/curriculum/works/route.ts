// app/api/whale/curriculum/works/route.ts
// Get curriculum works with optional filters

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  // Use admin client to bypass RLS for public curriculum data
  const supabase = createSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const areaId = searchParams.get('area');
  const categoryId = searchParams.get('category');
  const ageRange = searchParams.get('age');
  const limit = searchParams.get('limit');

  try {
    let query = supabase
      .from('curriculum_roadmap')
      .select('id, name, description, area_id, category_id, age_range, sequence, levels, materials')
      .order('sequence');

    if (areaId) query = query.eq('area_id', areaId);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (ageRange) query = query.eq('age_range', ageRange);
    if (limit) query = query.limit(parseInt(limit));

    const { data: works, error } = await query;

    if (error) throw error;

    return NextResponse.json({ 
      works: works || [],
      total: works?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching works:', error);
    return NextResponse.json(
      { error: 'Failed to fetch works' },
      { status: 500 }
    );
  }
}

