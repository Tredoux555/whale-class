import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('classroom_photos')
      .select('*')
      .order('photo_date', { ascending: false })
      .limit(limit);

    if (childId) {
      query = query.contains('child_ids', [childId]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, photos: data });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teacher_name, title, photo_url, child_ids, activity_type } = body;

    if (!teacher_name || !photo_url) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('classroom_photos')
      .insert({
        teacher_name,
        title,
        photo_url,
        child_ids: child_ids || [],
        activity_type,
        photo_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, photo: data });
  } catch (error) {
    console.error('Error saving photo:', error);
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
