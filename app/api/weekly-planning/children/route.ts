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
      .from('children')
      .select('id, name, avatar_emoji')
      .eq('active_status', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ children: data || [] });
  } catch (error) {
    console.error('Failed to fetch children:', error);
    return NextResponse.json({ children: [] });
  }
}
