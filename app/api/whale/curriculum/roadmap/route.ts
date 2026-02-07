// app/api/whale/curriculum/roadmap/route.ts
// Get complete curriculum roadmap

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const { data: roadmap, error } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .order('sequence_order', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: roadmap || [],
      count: roadmap?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching curriculum roadmap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch curriculum roadmap',
      },
      { status: 500 }
    );
  }
}

