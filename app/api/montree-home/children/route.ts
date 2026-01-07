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
  const includeProgress = searchParams.get('include_progress') === 'true';

  try {
    let query = supabase
      .from('home_children')
      .select('*')
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const { data: children, error } = await query;
    if (error) throw error;

    if (!includeProgress) {
      return NextResponse.json({ children: children || [] });
    }

    const childrenWithProgress = await Promise.all(
      (children || []).map(async (child) => {
        const { data: summary } = await supabase.rpc('get_home_child_progress_summary', {
          p_child_id: child.id
        });

        return {
          ...child,
          progress_summary: summary || {
            total_works: 0,
            mastered: 0,
            practicing: 0,
            presented: 0,
            overall_percent: 0,
            by_area: {}
          }
        };
      })
    );

    return NextResponse.json({ children: childrenWithProgress });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { family_id, name, birth_date, color } = body;

    if (!family_id || !name || !birth_date) {
      return NextResponse.json(
        { error: 'family_id, name, and birth_date required' },
        { status: 400 }
      );
    }

    const { data: child, error } = await supabase
      .from('home_children')
      .insert({
        family_id,
        name,
        birth_date,
        color: color || '#4F46E5'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ child });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating child:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('home_children')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting child:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
