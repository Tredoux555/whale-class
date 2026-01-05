import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');

  if (!childId) {
    return NextResponse.json({ error: 'childId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('child_work_progress')
    .select('*')
    .eq('child_id', childId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const body = await request.json();
  const { childId, workId, status } = body;

  if (!childId || !workId) {
    return NextResponse.json({ error: 'childId and workId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('child_work_progress')
    .upsert({
      child_id: childId,
      work_id: workId,
      status: status || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'child_id,work_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}
