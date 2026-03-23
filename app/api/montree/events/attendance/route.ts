// /api/montree/events/attendance/route.ts
// Bulk attendance tagging for class events
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// GET — List attendance for an event (with photo counts)
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify event belongs to school
    const { data: event, error: eventErr } = await supabase
      .from('montree_events')
      .select('id, school_id, classroom_id, name')
      .eq('id', eventId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch attendance + child names in parallel
    const [attendanceRes, photosRes] = await Promise.all([
      supabase
        .from('montree_event_attendance')
        .select('child_id, status, tagged_at, notes')
        .eq('event_id', eventId),
      supabase
        .from('montree_media')
        .select('id, child_id')
        .eq('event_id', eventId),
    ]);

    const attendance = attendanceRes.data || [];
    const photos = photosRes.data || [];

    // Count photos per child
    const photoCountMap: Record<string, number> = {};
    for (const p of photos) {
      if (p.child_id) {
        photoCountMap[p.child_id] = (photoCountMap[p.child_id] || 0) + 1;
      }
    }

    // Build response with photo counts
    const children = attendance.map(a => ({
      child_id: a.child_id,
      status: a.status,
      tagged_at: a.tagged_at,
      notes: a.notes,
      photo_count: photoCountMap[a.child_id] || 0,
    }));

    return NextResponse.json({
      success: true,
      event_id: eventId,
      event_name: event.name,
      children,
      total_tagged: children.length,
      total_photos: photos.length,
    });
  } catch (error) {
    console.error('Event attendance GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST — Bulk set/remove attendance
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Homeschool parents can't tag events
    if (auth.role === 'homeschool_parent') {
      return NextResponse.json({ error: 'Not available for homeschool' }, { status: 403 });
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { event_id, child_ids, action } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400 });
    }

    const validActions = ['set', 'set_all', 'remove'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 });
    }

    // Verify event belongs to school
    const { data: event, error: eventErr } = await supabase
      .from('montree_events')
      .select('id, school_id, classroom_id')
      .eq('id', event_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Determine classroom scope
    const classroomId = event.classroom_id || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'No classroom context available' }, { status: 400 });
    }

    // Teachers can only tag events in their own classroom
    if (auth.classroomId && event.classroom_id && auth.classroomId !== event.classroom_id) {
      return NextResponse.json({ error: 'Event belongs to a different classroom' }, { status: 403 });
    }

    // Handle set_all — fetch all children in classroom
    let targetChildIds: string[] = [];

    if (action === 'set_all') {
      if (!classroomId) {
        return NextResponse.json({ error: 'Classroom required for set_all' }, { status: 400 });
      }
      const { data: classChildren, error: childErr } = await supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', classroomId);

      if (childErr) {
        console.error('Fetch children error:', childErr.message);
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
      }

      targetChildIds = (classChildren || []).map(c => c.id);
    } else {
      // set or remove — require child_ids
      if (!Array.isArray(child_ids) || child_ids.length === 0) {
        return NextResponse.json({ error: 'child_ids array required' }, { status: 400 });
      }
      if (child_ids.length > 100) {
        return NextResponse.json({ error: 'Too many children (max 100)' }, { status: 400 });
      }
      targetChildIds = child_ids;
    }

    if (targetChildIds.length === 0) {
      return NextResponse.json({ success: true, tagged: 0, message: 'No children to tag' });
    }

    // Validate all child_ids belong to school
    const { data: validChildren, error: valErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('school_id', auth.schoolId)
      .in('id', targetChildIds);

    if (valErr) {
      console.error('Validate children error:', valErr.message);
      return NextResponse.json({ error: 'Failed to validate children' }, { status: 500 });
    }

    const validIds = new Set((validChildren || []).map(c => c.id));
    const invalidIds = targetChildIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: `${invalidIds.length} child ID(s) not found in school`,
      }, { status: 400 });
    }

    // Execute action
    if (action === 'remove') {
      const { error: delErr } = await supabase
        .from('montree_event_attendance')
        .delete()
        .eq('event_id', event_id)
        .in('child_id', targetChildIds);

      if (delErr) {
        console.error('Remove attendance error:', delErr.message);
        return NextResponse.json({ error: 'Failed to remove attendance' }, { status: 500 });
      }

      return NextResponse.json({ success: true, removed: targetChildIds.length });
    }

    // set or set_all — upsert
    const rows = targetChildIds.map(cid => ({
      event_id,
      child_id: cid,
      classroom_id: classroomId,
      school_id: auth.schoolId,
      status: 'attended',
      tagged_by: auth.userId,
      tagged_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('montree_event_attendance')
      .upsert(rows, { onConflict: 'event_id,child_id' });

    if (upsertErr) {
      console.error('Upsert attendance error:', upsertErr.message);
      return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tagged: targetChildIds.length,
      action,
    });
  } catch (error) {
    console.error('Event attendance POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
