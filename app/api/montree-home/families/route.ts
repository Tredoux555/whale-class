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
  const email = searchParams.get('email');
  const id = searchParams.get('id');

  try {
    let query = supabase
      .from('home_families')
      .select(`
        *,
        home_children (id, name, birth_date, color)
      `);

    // Filter by email for parent login
    if (email) {
      query = query.ilike('email', email);
    }

    // Filter by id for single family fetch
    if (id) {
      query = query.eq('id', id);
    }

    query = query.order('created_at', { ascending: false });

    const { data: families, error } = await query;

    if (error) throw error;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const familiesWithActivity = await Promise.all(
      (families || []).map(async (family) => {
        const { count } = await supabase
          .from('home_activity_log')
          .select('*', { count: 'exact', head: true })
          .eq('family_id', family.id)
          .gte('created_at', oneWeekAgo.toISOString());

        return {
          ...family,
          children: family.home_children || [],
          active_this_week: (count || 0) > 0
        };
      })
    );

    return NextResponse.json({ families: familiesWithActivity });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching families:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { email, name, timezone } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'email and name required' },
        { status: 400 }
      );
    }

    const { data: family, error: familyError } = await supabase
      .from('home_families')
      .insert({ email, name, timezone: timezone || 'America/Chicago' })
      .select()
      .single();

    if (familyError) throw familyError;

    const { data: seedCount } = await supabase.rpc('seed_home_curriculum_for_family', {
      p_family_id: family.id
    });

    return NextResponse.json({
      family,
      curriculum_items_created: seedCount || 0
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating family:', error);
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
      .from('home_families')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting family:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
