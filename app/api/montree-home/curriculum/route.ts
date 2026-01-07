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
  const master = searchParams.get('master') === 'true';

  try {
    if (master) {
      const { data, error } = await supabase
        .from('home_curriculum_master')
        .select('*')
        .eq('is_active', true)
        .order('area_sequence')
        .order('category_sequence')
        .order('sequence');

      if (error) throw error;
      return NextResponse.json({ curriculum: data || [] });
    }

    if (!familyId) {
      return NextResponse.json({ error: 'family_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('home_curriculum')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('area_sequence')
      .order('category_sequence')
      .order('sequence');

    if (error) throw error;
    return NextResponse.json({ curriculum: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { id, family_id, materials_owned, notes, is_active } = body;

    if (!id || !family_id) {
      return NextResponse.json(
        { error: 'id and family_id required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (materials_owned !== undefined) updates.materials_owned = materials_owned;
    if (notes !== undefined) updates.notes = notes;
    if (is_active !== undefined) updates.is_active = is_active;

    const { error } = await supabase
      .from('home_curriculum')
      .update(updates)
      .eq('id', id)
      .eq('family_id', family_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating curriculum:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
