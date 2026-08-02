// app/api/montree/patterns/route.ts
// Child patterns CRUD

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET: List patterns for a child
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const activeOnly = searchParams.get('active_only') !== 'false';

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    // SECURITY: verifySchoolRequest only proves the caller holds a valid token
    // for SOME school. Without this, any authenticated teacher could reach
    // another school's child by supplying its id.
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    const childAccess = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!childAccess.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('montree_child_patterns')
      .select('*')
      .eq('child_id', childId)
      .order('detected_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('still_active', true);
    }

    const { data: patterns, error } = await query;

    if (error) {
      console.error('Failed to fetch patterns:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch patterns' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patterns: patterns || [],
    }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
    });

  } catch (error) {
    console.error('Patterns GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update pattern (mark inactive, add notes)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, still_active, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // SECURITY: a pattern id alone is not authorisation. Resolve it to its
    // child and verify that child belongs to the caller's school — otherwise
    // any pattern in the system could be edited or deactivated by raw UUID.
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    const { data: patternRow } = await supabase
      .from('montree_child_patterns')
      .select('id, child_id')
      .eq('id', id)
      .maybeSingle();

    if (!patternRow) {
      return NextResponse.json({ success: false, error: 'Pattern not found' }, { status: 404 });
    }

    const patternAccess = await verifyChildBelongsToSchool(
      patternRow.child_id as string,
      auth.schoolId,
    );
    if (!patternAccess.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof still_active === 'boolean') updateData.still_active = still_active;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('montree_child_patterns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update pattern:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update pattern' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pattern: data,
    });

  } catch (error) {
    console.error('Patterns PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
