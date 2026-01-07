import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/montree-home/curriculum - Get master curriculum
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const area = searchParams.get('area');

    // If familyId provided, get family's curriculum
    // Otherwise get master curriculum template
    let query;
    
    if (familyId) {
      query = supabase
        .from('home_curriculum')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_active', true);
    } else {
      // Get from master template or first family as template
      query = supabase
        .from('home_curriculum_master')
        .select('*')
        .eq('is_active', true);
    }

    if (area) {
      query = query.eq('area', area);
    }

    query = query
      .order('area_sequence')
      .order('category_sequence')
      .order('sequence');

    const { data: curriculum, error } = await query;

    if (error) {
      // If master table doesn't exist, return empty array
      if (error.code === '42P01') {
        return NextResponse.json({ curriculum: [] });
      }
      console.error('Error fetching curriculum:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ curriculum: curriculum || [] });
  } catch (error) {
    console.error('Curriculum GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/montree-home/curriculum - Update curriculum item
export async function POST(request: NextRequest) {
  try {
    const { id, updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Curriculum item ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('home_curriculum')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating curriculum:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, curriculum: data });
  } catch (error) {
    console.error('Curriculum POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
