// /api/montree/raz/route.ts
// RAZ Reading Tracker API
// Handles daily reading records: 3 photos per kid (book, signature, new book) + read/not_read/no_folder/absent toggle

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET - Get RAZ records for a classroom on a given date
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!classroomId && !childId) {
      return NextResponse.json(
        { success: false, error: 'classroom_id or child_id required' },
        { status: 400 }
      );
    }

    // Verify child access if child_id is provided
    if (childId) {
      const childCheck = await verifyChildBelongsToSchool(childId, auth.schoolId!);
      if (!childCheck.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    let query = supabase.from('raz_reading_records').select('*');

    if (childId) {
      query = query.eq('child_id', childId);
    } else if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    // Date range or single date
    if (from && to) {
      query = query.gte('record_date', from).lte('record_date', to);
    } else {
      query = query.eq('record_date', date);
    }

    query = query.order('record_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('RAZ fetch error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, records: data || [] });
  } catch (error) {
    console.error('RAZ GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update a RAZ reading record
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { child_id, classroom_id, date, status, book_title, notes, recorded_by, recorded_by_id } = body;

    if (!child_id || !classroom_id) {
      return NextResponse.json(
        { success: false, error: 'child_id and classroom_id required' },
        { status: 400 }
      );
    }

    // Verify child belongs to this school
    const childCheck = await verifyChildBelongsToSchool(child_id, auth.schoolId!);
    if (!childCheck.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const recordDate = date || new Date().toISOString().split('T')[0];

    // Validate status
    const validStatuses = ['read', 'not_read', 'no_folder', 'absent'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('raz_reading_records')
      .upsert({
        child_id,
        classroom_id,
        record_date: recordDate,
        status: status || 'not_read',
        book_title: book_title || null,
        notes: notes || null,
        recorded_by: recorded_by || null,
        recorded_by_id: recorded_by_id || null,
      }, {
        onConflict: 'child_id,record_date'
      })
      .select()
      .single();

    if (error) {
      console.error('RAZ upsert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('RAZ POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update photo URLs or status on existing record
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { record_id, child_id, date, status, book_photo_url, signature_photo_url, new_book_photo_url, book_title, notes } = body;

    // Validate status if provided
    const validStatuses = ['read', 'not_read', 'no_folder', 'absent'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify child ownership if child_id provided
    if (child_id) {
      const childCheck = await verifyChildBelongsToSchool(child_id, auth.schoolId!);
      if (!childCheck.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Can update by record_id OR by child_id + date
    const updateData: Record<string, any> = {};
    if (status !== undefined) updateData.status = status;
    if (book_photo_url !== undefined) updateData.book_photo_url = book_photo_url;
    if (signature_photo_url !== undefined) updateData.signature_photo_url = signature_photo_url;
    if (new_book_photo_url !== undefined) updateData.new_book_photo_url = new_book_photo_url;
    if (book_title !== undefined) updateData.book_title = book_title;
    if (notes !== undefined) updateData.notes = notes;

    let query;
    if (record_id) {
      query = supabase.from('raz_reading_records').update(updateData).eq('id', record_id);
    } else if (child_id && date) {
      query = supabase.from('raz_reading_records').update(updateData)
        .eq('child_id', child_id).eq('record_date', date);
    } else {
      return NextResponse.json(
        { success: false, error: 'record_id or (child_id + date) required' },
        { status: 400 }
      );
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error('RAZ update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('RAZ PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
