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
  const familyId = searchParams.get('family_id');

  if (!familyId) {
    return NextResponse.json({ error: 'family_id required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('home_families')
      .select('materials_owned')
      .eq('id', familyId)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      owned: data?.materials_owned || [] 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { family_id, owned } = body;

    if (!family_id) {
      return NextResponse.json({ error: 'family_id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('home_families')
      .update({ 
        materials_owned: owned || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', family_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving materials:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
