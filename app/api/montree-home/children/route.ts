import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/montree-home/children - List children (optionally with progress)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const childId = searchParams.get('childId');
    const includeProgress = searchParams.get('progress') === 'true';

    // If specific child with progress
    if (childId && includeProgress) {
      const { data: child, error: childError } = await supabase
        .from('home_children')
        .select('*')
        .eq('id', childId)
        .single();

      if (childError) {
        return NextResponse.json({ error: childError.message }, { status: 500 });
      }

      // Get progress summary
      const { data: progressData } = await supabase.rpc('get_home_child_progress_summary', {
        p_child_id: childId
      });

      return NextResponse.json({ 
        child,
        progress: progressData || {
          total_works: 0,
          mastered: 0,
          practicing: 0,
          presented: 0,
          overall_percent: 0,
          by_area: {}
        }
      });
    }

    // List all children
    let query = supabase
      .from('home_children')
      .select('*')
      .order('created_at', { ascending: false });

    if (familyId) {
      query = query.eq('family_id', familyId);
    }

    const { data: children, error } = await query;

    if (error) {
      console.error('Error fetching children:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ children: children || [] });
  } catch (error) {
    console.error('Children GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/montree-home/children - Create a new child
export async function POST(request: NextRequest) {
  try {
    const { family_id, name, birth_date, color } = await request.json();

    if (!family_id || !name || !birth_date) {
      return NextResponse.json({ error: 'Family ID, name, and birth date are required' }, { status: 400 });
    }

    const { data: child, error } = await supabase
      .from('home_children')
      .insert({
        family_id,
        name,
        birth_date,
        color: color || '#4F46E5',
        start_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating child:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, child });
  } catch (error) {
    console.error('Children POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/montree-home/children?id=xxx - Delete a child
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('home_children')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting child:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Children DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
