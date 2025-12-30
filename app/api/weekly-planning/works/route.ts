import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, work_name, area')
      .order('area')
      .order('work_name');

    if (error) throw error;

    return NextResponse.json({ works: data || [] });
  } catch (error) {
    console.error('Failed to fetch works:', error);
    return NextResponse.json({ works: [] });
  }
}
