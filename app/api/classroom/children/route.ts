// API: Get children directly from THE STEM (children table)
// No weekly assignments needed - just the students

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const schoolSlug = url.searchParams.get('school') || 'beijing-international';

    // Get school
    const { data: school } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('slug', schoolSlug)
      .single();

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get children for this school, ordered by display_order
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, display_order, active_status, date_of_birth')
      .eq('school_id', school.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Children query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      school,
      children: children || [],
      total: children?.length || 0
    });

  } catch (error) {
    console.error('Failed to fetch children:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
