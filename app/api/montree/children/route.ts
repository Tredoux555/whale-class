// app/api/montree/children/route.ts
// Children API: Fetches children filtered by classroom_id

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/children?classroom_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    
    const supabase = await createServerClient();
    
    // Build query
    let query = supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url, display_order, classroom_id')
      .order('display_order', { ascending: true })
      .order('name');
    
    // Filter by classroom if provided
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    
    const { data: children, error } = await query;
    
    if (error) {
      console.error('Fetch children error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate age and add progress placeholder
    const childrenWithAge = (children || []).map(child => {
      let age = null;
      if (child.date_of_birth) {
        const birthDate = new Date(child.date_of_birth);
        const today = new Date();
        age = ((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
      }
      return {
        ...child,
        age: age ? parseFloat(age) : null,
        progress: 0
      };
    });
    
    return NextResponse.json({ children: childrenWithAge });
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}
