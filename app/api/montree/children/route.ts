// /api/montree/children/route.ts
// Returns children for a classroom
// Fixed: Inline client creation to avoid any import issues

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    
    // Create client inline to guarantee fresh connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
      .from('montree_children')
      .select('id, name, age, photo_url, notes, classroom_id')
      .order('name');
    
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }
    
    return NextResponse.json({ children: data || [] });
    
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
