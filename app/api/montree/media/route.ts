// app/api/montree/media/route.ts
// Media list endpoint - fetches media with filters
// Phase 2 - Session 53 (FIX - route was missing)

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/media - List media with filters
export async function GET(request: NextRequest) {
  try {
    // Verify teacher is logged in
    const cookieStore = await cookies();
    const teacherName = cookieStore.get('teacherName')?.value;
    
    if (!teacherName) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const child_id = searchParams.get('child_id');
    const classroom_id = searchParams.get('classroom_id');
    const work_id = searchParams.get('work_id');
    const area = searchParams.get('area');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const untagged_only = searchParams.get('untagged_only') === 'true';
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    const supabase = await createServerClient();

    // Build query
    let query = supabase
      .from('montree_media')
      .select('*', { count: 'exact' })
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (child_id) {
      query = query.eq('child_id', child_id);
    }
    
    if (classroom_id) {
      query = query.eq('classroom_id', classroom_id);
    }
    
    if (work_id) {
      query = query.eq('work_id', work_id);
    }
    
    if (untagged_only) {
      query = query.is('child_id', null);
    }
    
    if (date_from) {
      query = query.gte('captured_at', date_from);
    }
    
    if (date_to) {
      query = query.lte('captured_at', date_to);
    }

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media list error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // If area filter is specified, we need to join with work_translations
    // For now, return all and let client filter (future: add join)
    
    return NextResponse.json({
      success: true,
      media: media || [],
      total: count || 0,
      page,
      limit,
    });

  } catch (error) {
    console.error('Media list API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
