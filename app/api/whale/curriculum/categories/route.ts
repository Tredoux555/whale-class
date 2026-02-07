// app/api/whale/curriculum/categories/route.ts
// Get all curriculum categories

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  // Use admin client to bypass RLS for public curriculum data
  const supabase = createSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const areaId = searchParams.get('area');

  try {
    let query = supabase
      .from('curriculum_categories')
      .select('id, name, description, area_id, sequence')
      .order('sequence');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return NextResponse.json({ categories: categories || [] });

  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details },
      { status: 500 }
    );
  }
}

