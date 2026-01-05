import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// GET - Fetch child info for parent view
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ success: false, error: 'childId required' }, { status: 400 });
    }

    const { data: child, error } = await supabase
      .from('children')
      .select('id, name, age_group, date_of_birth')
      .eq('id', childId)
      .single();

    if (error || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      child: {
        id: child.id,
        name: child.name,
        age_group: child.age_group
      }
    });

  } catch (error) {
    console.error('Get child error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
