// /api/montree/events/route.ts
// CRUD for special events (Cultural Day, Scouts Day, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// GET - List events for a school
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    // Always use auth.schoolId — ignore any school_id query param
    let query = supabase
      .from('montree_events')
      .select('*')
      .eq('school_id', auth.schoolId)
      .order('event_date', { ascending: false });

    if (year) {
      query = query
        .gte('event_date', `${year}-01-01`)
        .lte('event_date', `${year}-12-31`);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Events list error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ success: true, events: events || [] });
  } catch (error) {
    console.error('Events list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { name, event_date, description, event_type } = body;

    if (!name || !name.trim() || !event_date) {
      return NextResponse.json({ error: 'name and event_date required' }, { status: 400 });
    }

    if (name.length > 200) {
      return NextResponse.json({ error: 'Event name too long' }, { status: 400 });
    }

    // Validate classroom belongs to school (if provided)
    const classroomId = body.classroom_id || auth.classroomId || null;
    if (classroomId) {
      const { data: validClassroom } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();

      if (!validClassroom) {
        return NextResponse.json({ error: 'Classroom not found in school' }, { status: 403 });
      }
    }

    const { data: event, error } = await supabase
      .from('montree_events')
      .insert({
        school_id: auth.schoolId,
        classroom_id: classroomId,
        name: name.trim(),
        event_date,
        description: description?.trim() || null,
        event_type: event_type || 'special',
        created_by: auth.userId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Event create error:', error.message);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Event create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update an event
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { id, name, description, event_type, event_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (event_type !== undefined) updateData.event_type = event_type;
    if (event_date !== undefined) updateData.event_date = event_date;

    const { data: event, error } = await supabase
      .from('montree_events')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', auth.schoolId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Event update error:', error.message);
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Event update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete an event (only if no photos linked)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Check if any photos are linked to this event
    const { count, error: countError } = await supabase
      .from('montree_media')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id);

    if (countError) {
      console.error('Event photo count error:', countError.message);
      return NextResponse.json({ error: 'Failed to check event photos' }, { status: 500 });
    }

    if (count && count > 0) {
      return NextResponse.json({
        error: `Cannot delete event with ${count} linked photo(s). Remove photos first.`
      }, { status: 409 });
    }

    const { error } = await supabase
      .from('montree_events')
      .delete()
      .eq('id', id)
      .eq('school_id', auth.schoolId);

    if (error) {
      console.error('Event delete error:', error.message);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
