// /api/montree/parent/announcements/route.ts
// Fetch classroom announcements for parents

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child's classroom
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get announcements for the classroom
    const { data: announcements, error } = await supabase
      .from('montree_announcements')
      .select('id, title, content, priority, created_at, created_by')
      .eq('classroom_id', child.classroom_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist yet - return empty array
      console.log('Announcements query error (table may not exist):', error.message);
      return NextResponse.json({
        success: true,
        announcements: []
      });
    }

    return NextResponse.json({
      success: true,
      announcements: announcements || []
    });

  } catch (error) {
    console.error('Announcements API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
