import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/classroom/curriculum - Get all curriculum works for linking
export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  const { data: works, error } = await supabase
    .from('curriculum_roadmap')
    .select('id, name, area, category_id, sequence_order')
    .order('area')
    .order('sequence_order');

  if (error) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ works: works || [] });
}
