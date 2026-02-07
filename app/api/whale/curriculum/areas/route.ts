// app/api/whale/curriculum/areas/route.ts
// Get all curriculum areas

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  // Use admin client to bypass RLS for public curriculum data
  const supabase = createSupabaseAdmin();

  try {
    const { data: areas, error } = await supabase
      .from('curriculum_areas')
      .select('id, name, color, icon, sequence, description')
      .order('sequence');

    if (error) {
      console.error('Error fetching areas:', error);
      throw error;
    }

    return NextResponse.json({ areas: areas || [] });

  } catch (error: any) {
    console.error('Error fetching areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch areas', details: error?.message },
      { status: 500 }
    );
  }
}

