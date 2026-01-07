import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/montree-home/families - List all families
export async function GET(request: NextRequest) {
  try {
    const { data: families, error } = await supabase
      .from('home_families')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching families:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate active this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const { data: activeData } = await supabase
      .from('home_activity_log')
      .select('family_id')
      .gte('created_at', oneWeekAgo.toISOString());
    
    const activeThisWeek = new Set(activeData?.map(a => a.family_id)).size;

    return NextResponse.json({ 
      families: families || [],
      activeThisWeek,
    });
  } catch (error) {
    console.error('Families GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/montree-home/families - Create a new family
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Create family
    const { data: family, error: familyError } = await supabase
      .from('home_families')
      .insert({
        email,
        name,
        timezone: 'America/Chicago',
        settings: {
          notifications: { daily_reminder: true, daily_reminder_time: '08:00' },
          preferences: { activities_per_day: 3 }
        },
        onboarding_completed: false,
      })
      .select()
      .single();

    if (familyError) {
      console.error('Error creating family:', familyError);
      return NextResponse.json({ error: familyError.message }, { status: 500 });
    }

    // Seed curriculum for this family
    await supabase.rpc('seed_home_curriculum_for_family', { p_family_id: family.id });

    return NextResponse.json({ success: true, family });
  } catch (error) {
    console.error('Families POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/montree-home/families?id=xxx - Delete a family
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete family (cascades to children, curriculum, progress, etc.)
    const { error } = await supabase
      .from('home_families')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting family:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Families DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
