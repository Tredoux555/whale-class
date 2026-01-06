import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// GET /api/schools - List all active schools
export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data: schools, error } = await supabase
      .from('schools')
      .select('id, name, slug, logo_url, is_active, settings')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Schools query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schools: schools || [] });
  } catch (error: any) {
    console.error('Schools API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
