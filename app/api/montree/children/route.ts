// /api/montree/children/route.ts
// Returns children for a classroom

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('montree_children')
      .select('id, name, age, photo_url, notes, classroom_id')
      .order('name');
    
    // Filter by classroom if provided
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching children:', error);
      return NextResponse.json(
        { error: 'Failed to fetch children' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ children: data || [] });
    
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
