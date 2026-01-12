import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = sb
      .from('classroom_photos')
      .select('*')
      .order('photo_date', { ascending: false })
      .limit(limit);

    if (childId) query = query.contains('child_ids', [childId]);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, photos: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();
    const { teacher_name, title, photo_url, child_ids, activity_type } = body;

    if (!teacher_name || !photo_url) {
      return NextResponse.json({ success: false, error: 'Required fields missing' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('classroom_photos')
      .insert({
        teacher_name, title, photo_url,
        child_ids: child_ids || [],
        activity_type,
        photo_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, photo: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}
